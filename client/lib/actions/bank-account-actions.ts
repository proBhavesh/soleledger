"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "./business-context-actions";
import { 
  createManualBankAccountSchema, 
  updateManualBalanceSchema,
  BANK_ACCOUNT_ERROR_MESSAGES,
  type CreateManualBankAccountResponse,
  type BankAccountActionResponse
} from "@/lib/types/bank-accounts";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkBankAccountLimit } from "@/lib/services/usage-tracking";
import type { BankAccount } from "@/generated/prisma";
import { createOpeningBalanceJournalEntry, createBalanceAdjustmentJournalEntry } from "@/lib/actions/opening-balance-actions";
import { createBankAccountChartEntry } from "@/lib/actions/chart-of-accounts-actions";

/**
 * Calculate the actual balance of a bank account from its journal entries.
 * 
 * This function implements proper double-entry bookkeeping rules:
 * - For ASSET accounts (checking, savings): Debits increase balance, Credits decrease
 * - For LIABILITY accounts (credit cards): Credits increase balance, Debits decrease
 * 
 * @param chartOfAccountsId - The Chart of Accounts ID linked to the bank account
 * @param accountType - The type of bank account (determines if it's an asset or liability)
 * @returns The calculated balance based on all journal entries
 */
export async function calculateBankAccountBalance(
  chartOfAccountsId: string,
  accountType: string
): Promise<number> {
  const journalEntries = await db.journalEntry.groupBy({
    by: ['accountId'],
    where: {
      accountId: chartOfAccountsId,
    },
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
  });

  if (journalEntries.length === 0) {
    return 0;
  }

  const totals = journalEntries[0]._sum;
  const totalDebits = totals.debitAmount || 0;
  const totalCredits = totals.creditAmount || 0;

  // For ASSET accounts (checking, savings): Debits increase, Credits decrease
  // For LIABILITY accounts (credit cards): Credits increase, Debits decrease
  const isLiability = accountType === 'CREDIT_CARD';
  return isLiability 
    ? totalCredits - totalDebits 
    : totalDebits - totalCredits;
}

/**
 * Creates a manual bank account for financial institutions not supported by Plaid.
 * 
 * @param data - The bank account details
 * @param data.name - Display name for the account
 * @param data.accountType - Type of account (checking, savings, credit card, etc.)
 * @param data.accountNumber - Optional account number (typically last 4 digits)
 * @param data.institution - Name of the financial institution
 * @param data.balance - Current balance of the account
 * @param data.currency - Currency code (defaults to CAD)
 * 
 * @returns Promise resolving to success/error status and created account data
 * 
 * @throws Will return error if user is unauthorized, no business selected, or usage limits exceeded
 */
export async function createManualBankAccount(
  data: z.infer<typeof createManualBankAccountSchema>
): Promise<CreateManualBankAccountResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.unauthorized };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.noBusinessSelected };
    }

    // Validate input
    const validatedData = createManualBankAccountSchema.parse(data);

    // Check usage limits
    const usageCheck = await checkBankAccountLimit(session.user.id, businessId);
    if (!usageCheck.allowed) {
      return { success: false, error: usageCheck.message };
    }

    // Create the manual bank account
    const bankAccount = await db.bankAccount.create({
      data: {
        businessId,
        userId: session.user.id,
        name: validatedData.name,
        accountType: validatedData.accountType,
        accountNumber: validatedData.accountNumber,
        institution: validatedData.institution,
        balance: validatedData.balance,
        currency: validatedData.currency,
        isManual: true,
        lastManualUpdate: new Date(),
      },
      select: {
        id: true,
        name: true,
        accountType: true,
        balance: true,
        institution: true,
        businessId: true,
        accountNumber: true,
      },
    });

    // Create Chart of Accounts entry for this bank account
    const chartResult = await createBankAccountChartEntry(
      {
        id: bankAccount.id,
        businessId: bankAccount.businessId,
        name: bankAccount.name,
        accountType: bankAccount.accountType,
        institution: bankAccount.institution,
        accountNumber: bankAccount.accountNumber,
      },
      session.user.id
    );

    if (!chartResult.success) {
      // Log the error but don't fail the bank account creation
      console.error("Failed to create Chart of Accounts entry for bank account:", chartResult.error);
    }

    // Create opening balance journal entry if balance is non-zero
    if (validatedData.balance !== 0) {
      const journalResult = await createOpeningBalanceJournalEntry({
        bankAccountId: bankAccount.id,
        balance: validatedData.balance,
        businessId,
        userId: session.user.id
      });
      
      if (!journalResult.success) {
        console.error("Failed to create opening balance journal entry:", journalResult.error);
        // Continue anyway - the bank account is already created
      }
    }

    // Revalidate the bank accounts page
    revalidatePath("/dashboard/bank-accounts");

    return {
      success: true,
      data: {
        id: bankAccount.id,
        name: bankAccount.name,
        accountType: bankAccount.accountType,
        balance: bankAccount.balance,
        institution: bankAccount.institution!, // We know this is not null because we just created it
      },
    };
  } catch (error) {
    console.error("Error creating manual bank account:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || BANK_ACCOUNT_ERROR_MESSAGES.createFailed };
    }
    return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.createFailed };
  }
}

/**
 * Updates the balance of a manual bank account.
 * Only works for manual accounts, not Plaid-connected accounts.
 * 
 * @param data - The update data
 * @param data.bankAccountId - ID of the bank account to update
 * @param data.balance - New balance value
 * 
 * @returns Promise resolving to success/error status and updated account data
 * 
 * @throws Will return error if account not found, not manual, or user unauthorized
 */
export async function updateManualBalance(
  data: z.infer<typeof updateManualBalanceSchema>
): Promise<CreateManualBankAccountResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.unauthorized };
    }

    const validatedData = updateManualBalanceSchema.parse(data);

    // Check if the bank account exists and belongs to the user
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        id: validatedData.bankAccountId,
        userId: session.user.id,
      },
    });

    if (!bankAccount) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.notFound };
    }

    if (!bankAccount.isManual) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.notManual };
    }

    // Store the old balance for journal entry creation
    const oldBalance = bankAccount.balance;
    const newBalance = validatedData.balance;

    // Update the balance
    const updatedAccount = await db.bankAccount.update({
      where: {
        id: validatedData.bankAccountId,
      },
      data: {
        balance: newBalance,
        lastManualUpdate: new Date(),
      },
      select: {
        id: true,
        name: true,
        accountType: true,
        balance: true,
        institution: true,
        businessId: true,
      },
    });

    // Create balance adjustment journal entries if balance changed
    if (Math.abs(oldBalance - newBalance) >= 0.01) {
      const journalResult = await createBalanceAdjustmentJournalEntry({
        bankAccountId: updatedAccount.id,
        oldBalance,
        newBalance,
        businessId: updatedAccount.businessId,
        userId: session.user.id
      });

      if (!journalResult.success) {
        console.error("Failed to create balance adjustment journal entry:", journalResult.error);
        // Note: We don't rollback the balance update here as it's already committed
        // In production, you might want to use a transaction to ensure atomicity
      }
    }

    // Revalidate the bank accounts page
    revalidatePath("/dashboard/bank-accounts");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        id: updatedAccount.id,
        name: updatedAccount.name,
        accountType: updatedAccount.accountType,
        balance: updatedAccount.balance,
        institution: updatedAccount.institution!, // Manual accounts always have institution
      },
    };
  } catch (error) {
    console.error("Error updating manual balance:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || BANK_ACCOUNT_ERROR_MESSAGES.updateFailed };
    }
    return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.updateFailed };
  }
}

/**
 * Deletes a manual bank account.
 * Cannot delete accounts with existing transactions or Plaid-connected accounts.
 * 
 * @param bankAccountId - The ID of the bank account to delete
 * 
 * @returns Promise resolving to success/error status
 * 
 * @throws Will return error if account has transactions, not manual, or not found
 */
export async function deleteManualBankAccount(
  bankAccountId: string
): Promise<BankAccountActionResponse<void>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.unauthorized };
    }

    // Check if the bank account exists and belongs to the user
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!bankAccount) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.notFound };
    }

    if (!bankAccount.isManual) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.notManual };
    }

    // Check if there are transactions
    if (bankAccount._count.transactions > 0) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.hasTransactions };
    }

    // Delete the bank account
    await db.bankAccount.delete({
      where: {
        id: bankAccountId,
      },
    });

    // Revalidate the bank accounts page
    revalidatePath("/dashboard/bank-accounts");

    return { success: true };
  } catch (error) {
    console.error("Error deleting manual bank account:", error);
    return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.deleteFailed };
  }
}

/**
 * Retrieves all bank accounts for the current business.
 * Includes both manual and Plaid-connected accounts.
 * 
 * @returns Promise resolving to array of bank accounts with transaction counts
 * Orders results by: Plaid accounts first, then by type, then by name
 * 
 * @throws Will return error if user unauthorized or no business selected
 */
export async function getBankAccountsForBusiness(): Promise<BankAccountActionResponse<Array<BankAccount & { _count: { transactions: number }, calculatedBalance?: number }>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.unauthorized };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.noBusinessSelected };
    }

    const bankAccounts = await db.bankAccount.findMany({
      where: {
        businessId,
      },
      orderBy: [
        { isManual: "asc" }, // Plaid accounts first
        { accountType: "asc" },
        { name: "asc" },
      ],
      include: {
        _count: {
          select: { transactions: true },
        },
        chartOfAccounts: true,
      },
    });

    // Calculate actual balances from journal entries for accounts with Chart of Accounts mapping
    const accountsWithCalculatedBalances = await Promise.all(
      bankAccounts.map(async (account) => {
        if (account.chartOfAccountsId) {
          // Calculate balance from journal entries
          const calculatedBalance = await calculateBankAccountBalance(
            account.chartOfAccountsId,
            account.accountType
          );

          return {
            ...account,
            calculatedBalance,
            // Use calculated balance as the primary balance if available
            balance: calculatedBalance,
          };
        }
        
        // Return account as-is if no Chart of Accounts mapping
        return account;
      })
    );

    return {
      success: true,
      data: accountsWithCalculatedBalances,
    };
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.fetchFailed };
  }
}

/**
 * Get a single bank account with its calculated balance from journal entries
 * 
 * @param bankAccountId - The ID of the bank account to fetch
 * @returns Bank account with calculated balance or error
 */
export async function getBankAccountWithBalance(
  bankAccountId: string
): Promise<BankAccountActionResponse<BankAccount & { calculatedBalance?: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.unauthorized };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.noBusinessSelected };
    }

    const bankAccount = await db.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        businessId,
      },
      include: {
        chartOfAccounts: true,
      },
    });

    if (!bankAccount) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.notFound };
    }

    // Calculate balance from journal entries if Chart of Accounts is linked
    if (bankAccount.chartOfAccountsId) {
      const calculatedBalance = await calculateBankAccountBalance(
        bankAccount.chartOfAccountsId,
        bankAccount.accountType
      );

      return {
        success: true,
        data: {
          ...bankAccount,
          calculatedBalance,
          balance: calculatedBalance, // Override with calculated balance
        },
      };
    }

    return {
      success: true,
      data: bankAccount,
    };
  } catch (error) {
    console.error("Error fetching bank account with balance:", error);
    return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.fetchFailed };
  }
}