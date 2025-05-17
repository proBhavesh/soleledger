"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { plaidClient } from "@/lib/plaid/client";

// Define the request and response types for Plaid's recurringTransactionsGet
interface RecurringTransactionsGetRequest {
  access_token: string;
}

interface RecurringTransactionsGetResponse {
  data: {
    income?: RecurringStream[];
    expenses?: RecurringStream[];
  };
}

// Define the recurring stream type from Plaid's API
interface RecurringStream {
  stream_id: string;
  description?: string;
  category_id?: string;
  personal_finance_category?: {
    primary: string;
    detailed: string;
  };
  average_amount: number;
  last_amount?: number;
  last_date: string;
  frequency: string;
}

// Extended PlaidClient type with recurringTransactionsGet method
type PlaidClientWithRecurring = typeof plaidClient & {
  recurringTransactionsGet(
    request: RecurringTransactionsGetRequest
  ): Promise<RecurringTransactionsGetResponse>;
};

/**
 * Syncs recurring transactions for a connected account
 * Note: This is temporarily using standard Plaid API methods since recurringTransactionsGet
 * is not yet fully part of the Plaid API TypeScript definitions
 */
export async function syncRecurringTransactions(
  accessToken: string,
  businessId: string,
  userId: string
) {
  try {
    // Get recurring transactions from Plaid
    // Note: Use casting since the method is not fully typed in the Plaid SDK
    const response = await (
      plaidClient as PlaidClientWithRecurring
    ).recurringTransactionsGet({
      access_token: accessToken,
    });

    const recurringIncome = response.data.income || [];
    const recurringExpenses = response.data.expenses || [];

    // Find the bank account
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        plaidAccessToken: accessToken,
        businessId,
        userId,
      },
    });

    if (!bankAccount) {
      throw new Error("Bank account not found");
    }

    // Process recurring income streams
    for (const stream of recurringIncome) {
      // Find the most recent transaction for this stream
      const latestTransaction = stream.last_amount
        ? stream.last_amount
        : stream.average_amount;

      // Find if we already have a record for this stream
      const existingTransaction = await db.transaction.findFirst({
        where: {
          businessId,
          bankAccountId: bankAccount.id,
          reference: `recurring-${stream.stream_id}`,
        },
      });

      // Get or create a category for recurring income
      let category = await db.category.findFirst({
        where: {
          businessId,
          name: "Recurring Income",
          type: "INCOME",
        },
      });

      if (!category) {
        category = await db.category.create({
          data: {
            businessId,
            name: "Recurring Income",
            type: "INCOME",
            isDefault: false,
            creatorId: userId,
          },
        });
      }

      // Store or update the recurring income information
      if (existingTransaction) {
        await db.transaction.update({
          where: {
            id: existingTransaction.id,
          },
          data: {
            amount: latestTransaction,
            description: stream.description || "Recurring Income",
            notes: `Frequency: ${stream.frequency}, Last date: ${stream.last_date}`,
          },
        });
      } else {
        await db.transaction.create({
          data: {
            businessId,
            bankAccountId: bankAccount.id,
            categoryId: category.id,
            type: "INCOME",
            amount: latestTransaction,
            currency: "USD", // Assuming USD, should be updated based on account currency
            date: new Date(stream.last_date),
            description: stream.description || "Recurring Income",
            notes: `Frequency: ${stream.frequency}, Average: $${stream.average_amount}`,
            reference: `recurring-${stream.stream_id}`,
            isReconciled: true, // Since this is a recurring stream, not a specific transaction
            createdById: userId,
          },
        });
      }
    }

    // Process recurring expense streams
    for (const stream of recurringExpenses) {
      // Find the most recent transaction for this stream
      const latestTransaction = stream.last_amount
        ? stream.last_amount
        : stream.average_amount;

      // Find if we already have a record for this stream
      const existingTransaction = await db.transaction.findFirst({
        where: {
          businessId,
          bankAccountId: bankAccount.id,
          reference: `recurring-${stream.stream_id}`,
        },
      });

      // Get or create a category based on the transaction type
      let categoryName = "Recurring Expense";
      if (stream.personal_finance_category) {
        categoryName = stream.personal_finance_category.detailed;
      }

      let category = await db.category.findFirst({
        where: {
          businessId,
          name: categoryName,
          type: "EXPENSE",
        },
      });

      if (!category) {
        category = await db.category.create({
          data: {
            businessId,
            name: categoryName,
            type: "EXPENSE",
            isDefault: false,
            creatorId: userId,
          },
        });
      }

      // Store or update the recurring expense information
      if (existingTransaction) {
        await db.transaction.update({
          where: {
            id: existingTransaction.id,
          },
          data: {
            amount: latestTransaction,
            description: stream.description || "Recurring Expense",
            notes: `Frequency: ${stream.frequency}, Last date: ${stream.last_date}`,
          },
        });
      } else {
        await db.transaction.create({
          data: {
            businessId,
            bankAccountId: bankAccount.id,
            categoryId: category.id,
            type: "EXPENSE",
            amount: latestTransaction,
            currency: "USD", // Assuming USD, should be updated based on account currency
            date: new Date(stream.last_date),
            description: stream.description || "Recurring Expense",
            notes: `Frequency: ${stream.frequency}, Average: $${stream.average_amount}`,
            reference: `recurring-${stream.stream_id}`,
            isReconciled: true, // Since this is a recurring stream, not a specific transaction
            createdById: userId,
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing recurring transactions:", error);
    // Don't throw here, as this is a secondary feature and shouldn't block the main flow
    return { success: false, error: "Failed to sync recurring transactions" };
  }
}

/**
 * Gets all recurring transactions
 */
export async function getRecurringTransactions() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // Get active business for the user
  const business = await db.business.findFirst({
    where: {
      ownerId: userId,
    },
  });

  if (!business) {
    return { recurringIncome: [], recurringExpenses: [] };
  }

  // Find all transactions marked as recurring (using the reference field pattern)
  const recurringTransactions = await db.transaction.findMany({
    where: {
      businessId: business.id,
      reference: {
        startsWith: "recurring-",
      },
    },
    include: {
      category: true,
      bankAccount: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  // Separate into income and expenses
  const recurringIncome = recurringTransactions.filter(
    (t) => t.type === "INCOME"
  );
  const recurringExpenses = recurringTransactions.filter(
    (t) => t.type === "EXPENSE"
  );

  return {
    recurringIncome,
    recurringExpenses,
  };
}
