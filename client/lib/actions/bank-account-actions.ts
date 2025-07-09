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
      },
    });

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

    // Update the balance
    const updatedAccount = await db.bankAccount.update({
      where: {
        id: validatedData.bankAccountId,
      },
      data: {
        balance: validatedData.balance,
        lastManualUpdate: new Date(),
      },
      select: {
        id: true,
        name: true,
        accountType: true,
        balance: true,
        institution: true,
      },
    });

    // Revalidate the bank accounts page
    revalidatePath("/dashboard/bank-accounts");

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
export async function getBankAccountsForBusiness(): Promise<BankAccountActionResponse<Array<BankAccount & { _count: { transactions: number } }>>> {
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
      },
    });

    return {
      success: true,
      data: bankAccounts,
    };
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return { success: false, error: BANK_ACCOUNT_ERROR_MESSAGES.fetchFailed };
  }
}