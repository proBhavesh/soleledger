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
import { createOpeningBalanceJournalEntry, createBalanceAdjustmentJournalEntry } from "@/lib/actions/opening-balance-actions";
import { createBankAccountChartEntry } from "@/lib/actions/chart-of-accounts-actions";
import { getAllBankAccountsWithBalances, getBankAccountWithBalance, type BankAccountWithBalance } from "@/lib/services/bank-balance-service";


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
 * Updates the balance of a manual bank account by creating balance adjustment journal entries.
 * Only works for manual accounts, not Plaid-connected accounts.
 * 
 * IMPORTANT: For manual accounts, balance is calculated from journal entries, not stored in the database.
 * This function creates the necessary journal entries to adjust the calculated balance.
 * 
 * @param data - The update data
 * @param data.bankAccountId - ID of the bank account to update
 * @param data.balance - New balance value (will create adjustment entries to reach this balance)
 * 
 * @returns Promise resolving to success/error status and updated account data
 * 
 * @throws Will return error if account not found, not manual, or user unauthorized
 * 
 * @deprecated Consider using specific transaction types instead of balance adjustments
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

    // Get the current calculated balance using our balance service
    const bankAccountWithBalance = await getBankAccountWithBalance(validatedData.bankAccountId);
    if (!bankAccountWithBalance) {
      return { success: false, error: "Failed to get current balance" };
    }
    
    const oldBalance = bankAccountWithBalance.calculatedBalance;
    const newBalance = validatedData.balance;

    // For manual accounts, we don't update the balance field in the database
    // Instead, we only create journal entries to adjust the calculated balance
    // Update only the lastManualUpdate timestamp
    const updatedAccount = await db.bankAccount.update({
      where: {
        id: validatedData.bankAccountId,
      },
      data: {
        // Don't update balance field - it's calculated from journal entries
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
        return { success: false, error: "Failed to create balance adjustment" };
      }
    }

    // Revalidate the bank accounts page
    revalidatePath("/dashboard/bank-accounts");
    revalidatePath("/dashboard");

    // Return the new calculated balance (after adjustment)
    return {
      success: true,
      data: {
        id: updatedAccount.id,
        name: updatedAccount.name,
        accountType: updatedAccount.accountType,
        balance: newBalance, // Return the new balance that was set via journal entries
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
 * Retrieves all bank accounts for the current business with proper balances.
 * 
 * - Plaid accounts: Shows API-synced balance (authoritative source)
 * - Manual accounts: Shows balance calculated from journal entries
 * 
 * @returns Promise resolving to array of bank accounts with calculated balances
 * @throws Will return error if user unauthorized or no business selected
 */
export async function getBankAccountsForBusiness(): Promise<BankAccountActionResponse<BankAccountWithBalance[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.unauthorized };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.noBusinessSelected };
    }

    // Use the centralized service to get accounts with proper balances
    const accountsWithBalances = await getAllBankAccountsWithBalances(businessId);

    return {
      success: true,
      data: accountsWithBalances,
    };
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.fetchFailed };
  }
}

/**
 * Get a single bank account with its proper balance.
 * 
 * - Plaid accounts: Returns API-synced balance
 * - Manual accounts: Returns balance calculated from journal entries
 * 
 * @param bankAccountId - The ID of the bank account to fetch
 * @returns Bank account with calculated balance or error
 */
export async function getSingleBankAccountWithBalance(
  bankAccountId: string
): Promise<BankAccountActionResponse<BankAccountWithBalance | null>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.unauthorized };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.noBusinessSelected };
    }

    // Verify the account belongs to the business
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        businessId,
      },
    });

    if (!bankAccount) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.notFound };
    }

    // Use the centralized service to get the account with proper balance
    const accountWithBalance = await getBankAccountWithBalance(bankAccountId);

    if (!accountWithBalance) {
      return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.notFound };
    }

    return {
      success: true,
      data: accountWithBalance,
    };
  } catch (error) {
    console.error("Error fetching bank account with balance:", error);
    return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.fetchFailed };
  }
}