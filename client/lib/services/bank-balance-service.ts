/**
 * Bank Balance Service
 * 
 * Centralized service for calculating and managing bank account balances.
 * This service implements the correct balance calculation logic:
 * - Plaid accounts: Use API-synced balance (authoritative source)
 * - Manual accounts: Calculate from journal entries (source of truth)
 * 
 * This ensures data integrity and prevents balance drift between
 * transactions and displayed balances.
 */

import { db } from "@/lib/db";
import type { BankAccount, Prisma } from "@/generated/prisma";

export interface BankAccountWithBalance extends BankAccount {
  calculatedBalance: number;
  balanceSource: 'api' | 'calculated';
  lastCalculated?: Date;
}

/**
 * Calculate balance from journal entries for a specific Chart of Accounts
 * 
 * Implements double-entry bookkeeping rules:
 * - Asset accounts (checking, savings): Debits increase, Credits decrease
 * - Liability accounts (credit cards): Credits increase, Debits decrease
 */
async function calculateBalanceFromJournal(
  chartOfAccountsId: string,
  accountType: string,
  asOfDate?: Date
): Promise<number> {
  const whereClause: Prisma.JournalEntryWhereInput = {
    accountId: chartOfAccountsId,
  };

  // If asOfDate provided, only include transactions up to that date
  if (asOfDate) {
    whereClause.transaction = {
      date: {
        lte: asOfDate,
      },
    };
  }

  const aggregateResult = await db.journalEntry.aggregate({
    where: whereClause,
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
  });

  const totalDebits = aggregateResult._sum.debitAmount || 0;
  const totalCredits = aggregateResult._sum.creditAmount || 0;

  // Apply accounting rules based on account type
  const isLiability = accountType === 'CREDIT_CARD';
  return isLiability 
    ? totalCredits - totalDebits  // Liabilities increase with credits
    : totalDebits - totalCredits;  // Assets increase with debits
}

/**
 * Get a single bank account with its proper balance
 * 
 * @param bankAccountId - The bank account ID
 * @param asOfDate - Optional date to calculate balance as of
 * @returns Bank account with calculated or API balance
 */
export async function getBankAccountWithBalance(
  bankAccountId: string,
  asOfDate?: Date
): Promise<BankAccountWithBalance | null> {
  const account = await db.bankAccount.findUnique({
    where: { id: bankAccountId },
    include: {
      chartOfAccounts: true,
    },
  });

  if (!account) {
    return null;
  }

  // For Plaid accounts, use the API-synced balance
  if (!account.isManual && account.plaidItemId) {
    return {
      ...account,
      calculatedBalance: account.balance,
      balanceSource: 'api',
      lastCalculated: account.lastSync || undefined,
    };
  }

  // For manual accounts, calculate from journal entries
  if (account.chartOfAccountsId) {
    const calculatedBalance = await calculateBalanceFromJournal(
      account.chartOfAccountsId,
      account.accountType,
      asOfDate
    );

    return {
      ...account,
      calculatedBalance,
      balanceSource: 'calculated',
      lastCalculated: new Date(),
    };
  }

  // Fallback for accounts without Chart of Accounts (shouldn't happen in production)
  console.warn(`Bank account ${bankAccountId} has no Chart of Accounts mapping`);
  return {
    ...account,
    calculatedBalance: account.balance,
    balanceSource: 'calculated',
    lastCalculated: new Date(),
  };
}

/**
 * Get all bank accounts for a business with proper balances
 * 
 * @param businessId - The business ID
 * @param asOfDate - Optional date to calculate balances as of
 * @returns Array of bank accounts with calculated or API balances
 */
export async function getAllBankAccountsWithBalances(
  businessId: string,
  asOfDate?: Date
): Promise<BankAccountWithBalance[]> {
  const accounts = await db.bankAccount.findMany({
    where: { businessId },
    include: {
      chartOfAccounts: true,
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: [
      { isManual: 'asc' }, // Plaid accounts first
      { accountType: 'asc' },
      { name: 'asc' },
    ],
  });

  // Process each account to get proper balance
  const accountsWithBalances = await Promise.all(
    accounts.map(async (account) => {
      // For Plaid accounts, use the API-synced balance
      if (!account.isManual && account.plaidItemId) {
        return {
          ...account,
          calculatedBalance: account.balance,
          balanceSource: 'api' as const,
          lastCalculated: account.lastSync || undefined,
        };
      }

      // For manual accounts, calculate from journal entries
      if (account.chartOfAccountsId) {
        const calculatedBalance = await calculateBalanceFromJournal(
          account.chartOfAccountsId,
          account.accountType,
          asOfDate
        );

        return {
          ...account,
          calculatedBalance,
          balanceSource: 'calculated' as const,
          lastCalculated: new Date(),
        };
      }

      // Fallback (shouldn't happen in production)
      return {
        ...account,
        calculatedBalance: account.balance,
        balanceSource: 'calculated' as const,
        lastCalculated: new Date(),
      };
    })
  );

  return accountsWithBalances;
}

/**
 * Get total balances grouped by account type
 * 
 * @param businessId - The business ID
 * @param asOfDate - Optional date to calculate balances as of
 * @returns Object with total balances by type
 */
export async function getBalanceSummary(
  businessId: string,
  asOfDate?: Date
): Promise<{
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  byAccountType: Record<string, number>;
}> {
  const accounts = await getAllBankAccountsWithBalances(businessId, asOfDate);

  const summary = accounts.reduce(
    (acc, account) => {
      const balance = account.calculatedBalance;
      const type = account.accountType;

      // Track by specific type
      acc.byAccountType[type] = (acc.byAccountType[type] || 0) + balance;

      // Track assets vs liabilities
      if (type === 'CREDIT_CARD') {
        acc.totalLiabilities += Math.abs(balance); // Credit cards are liabilities
      } else {
        acc.totalAssets += balance; // Checking, savings are assets
      }

      return acc;
    },
    {
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
      byAccountType: {} as Record<string, number>,
    }
  );

  summary.netWorth = summary.totalAssets - summary.totalLiabilities;
  return summary;
}

/**
 * Reconcile Plaid account balance with journal entries
 * Useful for identifying missing transactions or sync issues
 * 
 * @param bankAccountId - The bank account ID
 * @returns Reconciliation details
 */
export async function reconcilePlaidBalance(
  bankAccountId: string
): Promise<{
  apiBalance: number;
  calculatedBalance: number;
  difference: number;
  isReconciled: boolean;
  possibleReasons: string[];
}> {
  const account = await db.bankAccount.findUnique({
    where: { id: bankAccountId },
    include: { chartOfAccounts: true },
  });

  if (!account || account.isManual || !account.plaidItemId) {
    throw new Error('Account is not a Plaid account');
  }

  const apiBalance = account.balance;
  let calculatedBalance = apiBalance; // Default if no Chart of Accounts

  if (account.chartOfAccountsId) {
    calculatedBalance = await calculateBalanceFromJournal(
      account.chartOfAccountsId,
      account.accountType
    );
  }

  const difference = apiBalance - calculatedBalance;
  const isReconciled = Math.abs(difference) < 0.01; // Within 1 cent

  const possibleReasons: string[] = [];
  if (!isReconciled) {
    if (difference > 0) {
      possibleReasons.push('Bank balance is higher - possible missing expense transactions');
      possibleReasons.push('Pending transactions not yet imported');
      possibleReasons.push('Bank fees or charges not imported');
    } else {
      possibleReasons.push('Bank balance is lower - possible missing income transactions');
      possibleReasons.push('Duplicate transactions imported');
      possibleReasons.push('Transactions imported with wrong amounts');
    }
  }

  return {
    apiBalance,
    calculatedBalance,
    difference,
    isReconciled,
    possibleReasons,
  };
}