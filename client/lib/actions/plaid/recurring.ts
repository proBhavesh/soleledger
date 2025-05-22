"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { plaidClient } from "@/lib/plaid/client";
import { RecurringExpense } from "@/lib/types/dashboard";

// Define types for Plaid recurring transactions (these may not be fully available in the SDK yet)
interface PlaidRecurringTransaction {
  stream_id: string;
  description: string;
  merchant_name?: string;
  average_amount: number;
  last_date: string;
  frequency: string;
  next_expected_settlement_date?: string;
  status: "ACTIVE" | "INACTIVE";
  personal_finance_category?: {
    primary: string;
    detailed: string;
    confidence_level: string;
  };
}

interface PlaidRecurringTransactionsResponse {
  recurring_transactions: PlaidRecurringTransaction[];
  updated_transactions: string[];
}

/**
 * Gets recurring transactions for all connected accounts
 */
export async function getRecurringTransactions() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    // Get active business for the user
    const business = await db.business.findFirst({
      where: {
        ownerId: userId,
      },
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Get bank accounts with Plaid connections
    const bankAccounts = await db.bankAccount.findMany({
      where: {
        businessId: business.id,
        plaidAccessToken: {
          not: null,
        },
      },
    });

    if (bankAccounts.length === 0) {
      return {
        success: true,
        recurringExpenses: [],
        message: "No connected bank accounts found",
      };
    }

    // Fetch recurring transactions from Plaid for each account
    const allRecurringExpenses: RecurringExpense[] = [];

    for (const account of bankAccounts) {
      if (!account.plaidAccessToken) continue;

      try {
        // Cast the response to our custom type since the SDK types might not be up to date
        const response = await plaidClient.transactionsRecurringGet({
          access_token: account.plaidAccessToken,
        });

        // Use type assertion for the response data
        const plaidData =
          response.data as unknown as PlaidRecurringTransactionsResponse;
        const plaidRecurringTransactions =
          plaidData.recurring_transactions || [];

        // Convert Plaid recurring transactions to our format
        const expenses: RecurringExpense[] = plaidRecurringTransactions.map(
          (transaction: PlaidRecurringTransaction) => {
            const isInflow = transaction.average_amount < 0;

            return {
              id: transaction.stream_id,
              description: transaction.merchant_name || transaction.description,
              amount: Math.abs(transaction.average_amount),
              frequency: transaction.frequency,
              category:
                transaction.personal_finance_category?.primary || "Other",
              lastDate: transaction.last_date,
              nextDate: transaction.next_expected_settlement_date,
              merchantName: transaction.merchant_name,
              merchantLogo: null, // Plaid doesn't provide logos in the current API
              status: transaction.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
              flow: isInflow ? "INFLOW" : "OUTFLOW",
            };
          }
        );

        allRecurringExpenses.push(...expenses);
      } catch (error) {
        console.error(
          `Error fetching recurring transactions for account ${account.id}:`,
          error
        );
        // Continue with other accounts even if one fails
      }
    }

    return {
      success: true,
      recurringExpenses: allRecurringExpenses,
    };
  } catch (error) {
    console.error("Error getting recurring transactions:", error);
    return {
      success: false,
      error: "Failed to get recurring transactions. Please try again later.",
    };
  }
}

/**
 * Syncs recurring transactions for a connected account
 */
export async function syncRecurringTransactions(accessToken: string) {
  try {
    // Get recurring transactions from Plaid
    const response = await plaidClient.transactionsRecurringGet({
      access_token: accessToken,
    });

    // Use type assertion for the response data
    const plaidData =
      response.data as unknown as PlaidRecurringTransactionsResponse;

    // Here you could store the recurring transactions in your database if needed
    console.log(
      `Successfully synced ${
        plaidData.recurring_transactions?.length || 0
      } recurring transactions`
    );

    return { success: true };
  } catch (error) {
    console.error("Error syncing recurring transactions:", error);
    throw new Error("Failed to sync recurring transactions");
  }
}
