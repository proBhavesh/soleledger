"use server";

import { db } from "@/lib/db";
import { ACCOUNT_CODES } from "@/lib/constants/chart-of-accounts";
import type { Prisma } from "@/generated/prisma";
import type {
  BalanceValidationResult,
  CreateOpeningBalanceParams,
  CreateBalanceAdjustmentParams,
  OpeningBalanceActionResponse,
} from "@/lib/types/opening-balance";
import { 
  DEFAULT_BALANCE_VALIDATION_CONFIG,
  OPENING_BALANCE_ERROR_MESSAGES 
} from "@/lib/types/opening-balance";

/**
 * Validates that a balance amount is valid for financial calculations
 * 
 * @param balance - The balance amount to validate
 * @returns Validation result with success status and optional error message
 * 
 * @example
 * const result = validateBalance(1000.50);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 */
function validateBalance(balance: number): BalanceValidationResult {
  // Check if balance is a valid number
  if (typeof balance !== 'number' || isNaN(balance) || !isFinite(balance)) {
    return { valid: false, error: OPENING_BALANCE_ERROR_MESSAGES.invalidBalance };
  }

  // Check decimal places (max 2 for currency)
  const decimalPlaces = (balance.toString().split('.')[1] || '').length;
  if (decimalPlaces > DEFAULT_BALANCE_VALIDATION_CONFIG.maxDecimalPlaces) {
    return { valid: false, error: OPENING_BALANCE_ERROR_MESSAGES.tooManyDecimals };
  }

  // Check reasonable range (prevent overflow)
  if (Math.abs(balance) > DEFAULT_BALANCE_VALIDATION_CONFIG.maxBalance) {
    return { valid: false, error: OPENING_BALANCE_ERROR_MESSAGES.balanceTooLarge };
  }

  return { valid: true };
}

/**
 * Creates opening balance journal entries for a bank account
 * This ensures the balance sheet balances when bank accounts with existing balances are added
 * 
 * @param params - Parameters for creating opening balance
 * @param params.bankAccountId - The ID of the bank account
 * @param params.balance - The opening balance amount
 * @param params.businessId - The ID of the business
 * @param params.userId - The ID of the user creating the entry
 * 
 * @returns Promise resolving to success status and optional error message
 * 
 * @remarks
 * - Uses database transaction to ensure atomicity
 * - Creates balanced double-entry journal entries
 * - Validates balance amount before processing
 * - Prevents duplicate opening balances
 * 
 * @example
 * const result = await createOpeningBalanceJournalEntry({
 *   bankAccountId: "clxyz123",
 *   balance: 1000.50,
 *   businessId: "clxyz456", 
 *   userId: "clxyz789"
 * });
 */
export async function createOpeningBalanceJournalEntry(
  params: CreateOpeningBalanceParams
): Promise<OpeningBalanceActionResponse> {
  const { bankAccountId, balance, businessId, userId } = params;
  // Validate inputs
  if (!bankAccountId || !businessId || !userId) {
    return { 
      success: false, 
      error: OPENING_BALANCE_ERROR_MESSAGES.missingParameters 
    };
  }

  // Validate balance
  const balanceValidation = validateBalance(balance);
  if (!balanceValidation.valid) {
    return { 
      success: false, 
      error: balanceValidation.error 
    };
  }

  // Skip if balance is zero
  if (balance === 0) {
    return { success: true };
  }

  // Round to 2 decimal places to avoid floating point issues
  const roundedBalance = Math.round(balance * 100) / 100;

  try {
    // Use a database transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Get the bank account with its Chart of Accounts entry
      const bankAccountWithChart = await tx.bankAccount.findFirst({
        where: {
          id: bankAccountId,
          businessId,
        },
        include: {
          chartOfAccounts: true,
        },
      });

      if (!bankAccountWithChart) {
        throw new Error("Bank account not found");
      }

      // Use the bank account's specific Chart of Accounts entry, or fall back to generic Cash account
      let bankChartAccount = bankAccountWithChart.chartOfAccounts;
      
      if (!bankChartAccount) {
        // Fallback to generic Cash account if bank doesn't have a specific chart entry
        bankChartAccount = await tx.category.findFirst({
          where: {
            businessId,
            accountCode: ACCOUNT_CODES.CASH,
            isActive: true,
          },
        });
        
        if (!bankChartAccount) {
          throw new Error(OPENING_BALANCE_ERROR_MESSAGES.cashAccountNotFound);
        }
      }

      // Get the Opening Balance Equity account
      const openingBalanceAccount = await tx.category.findFirst({
        where: {
          businessId,
          accountCode: ACCOUNT_CODES.OPENING_BALANCE_EQUITY,
          isActive: true,
        },
      });

      if (!openingBalanceAccount) {
        throw new Error(OPENING_BALANCE_ERROR_MESSAGES.openingBalanceAccountNotFound);
      }

      // Check if opening balance already exists for this bank account
      const existingOpeningBalance = await tx.transaction.findFirst({
        where: {
          bankAccountId,
          description: "Opening Balance",
          type: "TRANSFER",
        },
      });

      if (existingOpeningBalance) {
        throw new Error(OPENING_BALANCE_ERROR_MESSAGES.duplicateOpeningBalance);
      }

      // Create the transaction record for the opening balance
      const transaction = await tx.transaction.create({
        data: {
          businessId,
          bankAccountId,
          type: "TRANSFER", // Opening balances are neither income nor expense
          description: "Opening Balance",
          amount: Math.abs(roundedBalance),
          date: new Date(),
          createdById: userId,
          isReconciled: true, // Mark as reconciled since it's an opening balance
          notes: `Opening balance for bank account`,
        },
      });

      // Create journal entries with exact amounts to ensure balance
      const journalEntries: Prisma.JournalEntryCreateManyInput[] = [];

      if (roundedBalance > 0) {
        // Positive balance: Debit Cash, Credit Opening Balance Equity
        journalEntries.push(
          {
            transactionId: transaction.id,
            accountId: bankChartAccount.id,
            debitAmount: roundedBalance,
            creditAmount: 0,
            description: `Opening balance - ${bankAccountWithChart.name} increase`,
          },
          {
            transactionId: transaction.id,
            accountId: openingBalanceAccount.id,
            debitAmount: 0,
            creditAmount: roundedBalance,
            description: "Opening balance - Equity increase",
          }
        );
      } else {
        // Negative balance (overdraft): Credit Cash, Debit Opening Balance Equity
        const absBalance = Math.abs(roundedBalance);
        journalEntries.push(
          {
            transactionId: transaction.id,
            accountId: bankChartAccount.id,
            debitAmount: 0,
            creditAmount: absBalance,
            description: `Opening balance - ${bankAccountWithChart.name} decrease (overdraft)`,
          },
          {
            transactionId: transaction.id,
            accountId: openingBalanceAccount.id,
            debitAmount: absBalance,
            creditAmount: 0,
            description: "Opening balance - Equity decrease",
          }
        );
      }

      // Verify journal entries balance
      const totalDebits = journalEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0);
      const totalCredits = journalEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(OPENING_BALANCE_ERROR_MESSAGES.journalEntriesUnbalanced);
      }

      // Create journal entries
      await tx.journalEntry.createMany({
        data: journalEntries,
      });

      console.log(`Created opening balance journal entries for bank account ${bankAccountId} with balance ${roundedBalance}`);
      return { success: true };
    });

    return result;
  } catch (error) {
    console.error("Error creating opening balance journal entry:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : OPENING_BALANCE_ERROR_MESSAGES.transactionFailed 
    };
  }
}

/**
 * Creates balance adjustment journal entries when a manual bank account balance is updated
 * This maintains the accounting equation when balances change
 * 
 * @param params - Parameters for creating balance adjustment
 * @param params.bankAccountId - The ID of the bank account
 * @param params.oldBalance - The previous balance amount
 * @param params.newBalance - The new balance amount
 * @param params.businessId - The ID of the business
 * @param params.userId - The ID of the user making the adjustment
 * 
 * @returns Promise resolving to success status and optional error message
 * 
 * @remarks
 * - Uses database transaction to ensure atomicity
 * - Creates journal entries for the difference between old and new balance
 * - Validates both balance amounts before processing
 * - Skips if balance change is less than $0.01
 * - Maintains complete audit trail with notes
 * 
 * @example
 * const result = await createBalanceAdjustmentJournalEntry({
 *   bankAccountId: "clxyz123",
 *   oldBalance: 1000.00,
 *   newBalance: 1500.00,
 *   businessId: "clxyz456",
 *   userId: "clxyz789"
 * });
 */
export async function createBalanceAdjustmentJournalEntry(
  params: CreateBalanceAdjustmentParams
): Promise<OpeningBalanceActionResponse> {
  const { bankAccountId, oldBalance, newBalance, businessId, userId } = params;
  // Validate inputs
  if (!bankAccountId || !businessId || !userId) {
    return { 
      success: false, 
      error: OPENING_BALANCE_ERROR_MESSAGES.missingParameters 
    };
  }

  // Validate balances
  const oldBalanceValidation = validateBalance(oldBalance);
  if (!oldBalanceValidation.valid) {
    return { 
      success: false, 
      error: `Old balance: ${oldBalanceValidation.error}` 
    };
  }

  const newBalanceValidation = validateBalance(newBalance);
  if (!newBalanceValidation.valid) {
    return { 
      success: false, 
      error: `New balance: ${newBalanceValidation.error}` 
    };
  }

  // Calculate adjustment amount
  const adjustment = newBalance - oldBalance;
  
  // Skip if no change
  if (Math.abs(adjustment) < 0.01) {
    return { success: true };
  }

  // Round to 2 decimal places
  const roundedOldBalance = Math.round(oldBalance * 100) / 100;
  const roundedNewBalance = Math.round(newBalance * 100) / 100;
  const roundedAdjustment = roundedNewBalance - roundedOldBalance;

  try {
    // Use a database transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Get the bank account with its Chart of Accounts entry
      const bankAccountWithChart = await tx.bankAccount.findFirst({
        where: {
          id: bankAccountId,
          businessId,
        },
        include: {
          chartOfAccounts: true,
        },
      });

      if (!bankAccountWithChart) {
        throw new Error("Bank account not found");
      }

      // Use the bank account's specific Chart of Accounts entry, or fall back to generic Cash account
      let bankChartAccount = bankAccountWithChart.chartOfAccounts;
      
      if (!bankChartAccount) {
        // Fallback to generic Cash account if bank doesn't have a specific chart entry
        bankChartAccount = await tx.category.findFirst({
          where: {
            businessId,
            accountCode: ACCOUNT_CODES.CASH,
            isActive: true,
          },
        });
        
        if (!bankChartAccount) {
          throw new Error(OPENING_BALANCE_ERROR_MESSAGES.cashAccountNotFound);
        }
      }

      // Get the Opening Balance Equity account
      const openingBalanceAccount = await tx.category.findFirst({
        where: {
          businessId,
          accountCode: ACCOUNT_CODES.OPENING_BALANCE_EQUITY,
          isActive: true,
        },
      });

      if (!openingBalanceAccount) {
        throw new Error(OPENING_BALANCE_ERROR_MESSAGES.openingBalanceAccountNotFound);
      }

      // Create the transaction record for the balance adjustment
      const transaction = await tx.transaction.create({
        data: {
          businessId,
          bankAccountId,
          type: "TRANSFER",
          description: "Balance Adjustment",
          amount: Math.abs(roundedAdjustment),
          date: new Date(),
          createdById: userId,
          isReconciled: true,
          notes: `Manual balance adjustment from ${roundedOldBalance} to ${roundedNewBalance}`,
        },
      });

      // Create journal entries
      const journalEntries: Prisma.JournalEntryCreateManyInput[] = [];

      if (roundedAdjustment > 0) {
        // Balance increased: Debit Cash, Credit Opening Balance Equity
        journalEntries.push(
          {
            transactionId: transaction.id,
            accountId: bankChartAccount.id,
            debitAmount: roundedAdjustment,
            creditAmount: 0,
            description: `Balance adjustment - ${bankAccountWithChart.name} increase`,
          },
          {
            transactionId: transaction.id,
            accountId: openingBalanceAccount.id,
            debitAmount: 0,
            creditAmount: roundedAdjustment,
            description: "Balance adjustment - Equity increase",
          }
        );
      } else {
        // Balance decreased: Credit Cash, Debit Opening Balance Equity
        const absAdjustment = Math.abs(roundedAdjustment);
        journalEntries.push(
          {
            transactionId: transaction.id,
            accountId: bankChartAccount.id,
            debitAmount: 0,
            creditAmount: absAdjustment,
            description: `Balance adjustment - ${bankAccountWithChart.name} decrease`,
          },
          {
            transactionId: transaction.id,
            accountId: openingBalanceAccount.id,
            debitAmount: absAdjustment,
            creditAmount: 0,
            description: "Balance adjustment - Equity decrease",
          }
        );
      }

      // Verify journal entries balance
      const totalDebits = journalEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0);
      const totalCredits = journalEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(OPENING_BALANCE_ERROR_MESSAGES.journalEntriesUnbalanced);
      }

      // Create journal entries
      await tx.journalEntry.createMany({
        data: journalEntries,
      });

      console.log(`Created balance adjustment journal entries for bank account ${bankAccountId}: ${roundedOldBalance} -> ${roundedNewBalance}`);
      return { success: true };
    });

    return result;
  } catch (error) {
    console.error("Error creating balance adjustment journal entry:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : OPENING_BALANCE_ERROR_MESSAGES.adjustmentFailed 
    };
  }
}