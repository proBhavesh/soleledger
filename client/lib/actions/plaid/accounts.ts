"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { plaidClient } from "@/lib/plaid/client";
import { Transaction, BalanceHistoryPoint } from "@/lib/types/dashboard";
import { PlaidErrorResponse } from "@/lib/types/plaid";
import { revalidatePath } from "next/cache";
import { AxiosError } from "axios";
import { PLAID_ERROR_MESSAGES } from "@/lib/types/plaid-actions";
import { getAllBankAccountsWithBalances, type BankAccountWithBalance } from "@/lib/services/bank-balance-service";

// Define a simple transaction type for calculate balance history
interface PlaidTransactionSummary {
  account_id: string;
  amount: number;
  date: string;
}

/**
 * Gets all bank accounts for the current user's active business with proper balances
 * 
 * - Plaid accounts: Returns API-synced balance
 * - Manual accounts: Returns balance calculated from journal entries
 */
export async function getBankAccounts(businessId?: string): Promise<{
  success: boolean;
  accounts?: BankAccountWithBalance[];
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: PLAID_ERROR_MESSAGES.unauthorized,
    };
  }

  const userId = session.user.id;

  try {
    let business;

    if (businessId) {
      // If businessId is provided, verify user has access to it
      business = await db.business.findFirst({
        where: {
          id: businessId,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      });
    } else {
      // Otherwise, get the user's owned business
      business = await db.business.findFirst({
        where: {
          ownerId: userId,
        },
      });
    }

    if (!business) {
      return {
        success: false,
        error: PLAID_ERROR_MESSAGES.noBusinessFound,
      };
    }

    // Get bank accounts with proper balance calculation
    const accountsWithBalances = await getAllBankAccountsWithBalances(business.id);

    return {
      success: true,
      accounts: accountsWithBalances,
    };
  } catch (error) {
    console.error("Error getting bank accounts:", error);
    return {
      success: false,
      error: PLAID_ERROR_MESSAGES.fetchAccountsFailed,
    };
  }
}

/**
 * Get transactions for a specific bank account
 */
export async function getAccountTransactions(
  bankAccountId: string,
  limit: number = 5,
  businessId?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    let business;

    if (businessId) {
      // If businessId is provided, verify user has access to it
      business = await db.business.findFirst({
        where: {
          id: businessId,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      });
    } else {
      // Otherwise, get the user's owned business
      business = await db.business.findFirst({
        where: {
          ownerId: userId,
        },
      });
    }

    if (!business) {
      return { success: false, error: "No business found or access denied" };
    }

    // Verify account access
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        businessId: business.id,
      },
    });

    if (!bankAccount) {
      return { success: false, error: "Bank account not found" };
    }

    // Get transactions for the account
    const transactions = await db.transaction.findMany({
      where: {
        bankAccountId: bankAccountId,
        businessId: business.id,
      },
      include: {
        category: true,
      },
      orderBy: {
        date: "desc",
      },
      take: limit,
    });

    // Transform to the expected format
    const formattedTransactions: Transaction[] = transactions.map(
      (transaction) => ({
        id: transaction.id,
        description: transaction.description || "",
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        category: transaction.category?.name || "Uncategorized",
        merchantName: transaction.description || null,
        originalDescription: transaction.notes || null,
        pending: false,
        categoryConfidence: transaction.confidence || null,
        subcategory: transaction.category?.description || null,
        accountId: transaction.bankAccountId || null,
        accountName: bankAccount.name || null,
      })
    );

    return {
      success: true,
      transactions: formattedTransactions,
    };
  } catch (error) {
    console.error("Error getting account transactions:", error);
    return {
      success: false,
      error: "Failed to get transactions. Please try again later.",
    };
  }
}

/**
 * Refresh balance for a specific bank account in real-time
 */
export async function refreshBalances(bankAccountId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    // First verify the bank account exists and user has access
    const bankAccountWithBusiness = await db.bankAccount.findFirst({
      where: {
        id: bankAccountId,
      },
      include: {
        business: true,
      },
    });

    if (!bankAccountWithBusiness) {
      return {
        success: false,
        error: "Bank account not found",
      };
    }

    // Verify user has access to this business
    const hasAccess =
      bankAccountWithBusiness.business.ownerId === userId ||
      (await db.businessMember.findFirst({
        where: {
          businessId: bankAccountWithBusiness.businessId,
          userId,
        },
      }));

    if (!hasAccess) {
      return {
        success: false,
        error: "Access denied to this bank account",
      };
    }

    const bankAccount = bankAccountWithBusiness;

    if (!bankAccount || !bankAccount.plaidAccessToken) {
      return {
        success: false,
        error: "Bank account not found or not connected to Plaid",
      };
    }

    // Get real-time balance from Plaid
    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token: bankAccount.plaidAccessToken,
    });

    // Find the matching account in the Plaid response
    const plaidAccount = balanceResponse.data.accounts.find(
      (account) =>
        account.account_id === bankAccount.id ||
        account.mask === bankAccount.accountNumber?.slice(-4)
    );

    if (!plaidAccount) {
      return {
        success: false,
        error: "Could not find matching account in Plaid response",
      };
    }

    // Update the balance in our database
    await db.bankAccount.update({
      where: {
        id: bankAccountId,
      },
      data: {
        balance: plaidAccount.balances.current || 0,
        currency: plaidAccount.balances.iso_currency_code || "CAD",
        lastSync: new Date(),
      },
    });

    // Revalidate relevant paths
    revalidatePath("/dashboard");

    return {
      success: true,
      balance: plaidAccount.balances.current,
      availableBalance: plaidAccount.balances.available,
      limit: plaidAccount.balances.limit,
    };
  } catch (error) {
    console.error("Error refreshing balance:", error);
    return {
      success: false,
      error: "Failed to refresh balance. Please try again later.",
    };
  }
}

/**
 * Gets account balance history over time
 */
export async function getAccountBalanceHistory(
  accountId: string,
  timeRange: "7d" | "30d" | "90d" | "1y" = "30d"
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    // Get account details with business info
    const accountWithBusiness = await db.bankAccount.findFirst({
      where: {
        id: accountId,
      },
      include: {
        business: true,
      },
    });

    if (!accountWithBusiness) {
      return {
        success: false,
        error: "Bank account not found",
      };
    }

    // Verify user has access to this business
    const hasAccess =
      accountWithBusiness.business.ownerId === userId ||
      (await db.businessMember.findFirst({
        where: {
          businessId: accountWithBusiness.businessId,
          userId,
        },
      }));

    if (!hasAccess) {
      return {
        success: false,
        error: "Access denied to this bank account",
      };
    }

    const account = accountWithBusiness;

    if (!account || !account.plaidAccessToken) {
      return {
        success: false,
        error: "Bank account not found or not connected to Plaid",
      };
    }

    // Determine date range based on the requested time range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Format dates for Plaid API
    const startDateString = startDate.toISOString().split("T")[0];
    const endDateString = endDate.toISOString().split("T")[0];

    try {
      // Use transactions/get without account_ids filter to avoid the API error
      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: account.plaidAccessToken,
        start_date: startDateString,
        end_date: endDateString,
        options: {
          count: 500,
          offset: 0,
        },
      });

      // Find the matching account in the response
      const plaidAccounts = transactionsResponse.data.accounts;

      // Find the account that matches our account
      const matchingAccount = plaidAccounts.find(
        (acc) =>
          acc.mask === account.accountNumber?.slice(-4) ||
          acc.name.toLowerCase().includes(account.name.toLowerCase())
      );

      // Get the correct Plaid account ID
      const correctPlaidAccountId = matchingAccount?.account_id || "";

      // Filter transactions to the correct account
      let transactions = transactionsResponse.data.transactions;
      if (correctPlaidAccountId) {
        transactions = transactions.filter(
          (tx) => tx.account_id === correctPlaidAccountId
        );
      }

      // Get current balance to use as the starting point
      const currentBalance = account.balance || 0;

      // Calculate balance history by working backwards from the current balance
      const balanceHistory = calculateBalanceHistory(
        transactions,
        currentBalance,
        startDate,
        endDate,
        timeRange
      );

      return {
        success: true,
        history: balanceHistory,
      };
    } catch (error) {
      // Detailed logging of Plaid API error
      console.error("Plaid API Error:", error);

      // Extract and log detailed error information
      if (error && typeof error === "object" && "response" in error) {
        const plaidError = error as {
          response: {
            status: number;
            statusText: string;
            data: PlaidErrorResponse;
          };
        };

        console.error("Plaid API Error Response:", {
          status: plaidError.response.status,
          statusText: plaidError.response.statusText,
          data: plaidError.response.data,
        });

        // Log specific Plaid error details
        if (
          plaidError.response.data?.error_code === "INVALID_FIELD" &&
          plaidError.response.data?.error_message?.includes("account_ids")
        ) {
          console.error("Plaid account_ids error - check account ID format");
        }
      }

      throw error; // Re-throw to be caught by the outer catch block
    }
  } catch (error) {
    console.error("Error getting account balance history:", error);

    // Provide more specific error messages based on error type
    let errorMessage = "Failed to get balance history. Please try again later.";

    if (error instanceof Error) {
      if (error.message.includes("INVALID_ACCESS_TOKEN")) {
        errorMessage =
          "Your connection to this bank has expired. Please reconnect your account.";
      } else if (error.message.includes("PRODUCT_NOT_READY")) {
        errorMessage =
          "Transaction data is still being processed. Please try again in a few minutes.";
      } else if (error.message.includes("RATE_LIMIT_EXCEEDED")) {
        errorMessage = "Too many requests. Please try again later.";
      }

      // Check for specific Plaid error codes in the response data
      if (
        error.name === "AxiosError" &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "error_code" in error.response.data
      ) {
        const axiosError = error as AxiosError<{ error_code: string }>;
        const plaidErrorCode = axiosError.response?.data?.error_code;

        if (plaidErrorCode) {
          console.error("Plaid error code:", plaidErrorCode);

          switch (plaidErrorCode) {
            case "INVALID_ACCESS_TOKEN":
              errorMessage =
                "Your connection to this bank has expired. Please reconnect your account.";
              break;
            case "PRODUCT_NOT_READY":
              errorMessage =
                "Transaction data is still being processed. Please try again in a few minutes.";
              break;
            case "ITEM_LOGIN_REQUIRED":
              errorMessage =
                "Your bank requires you to log in again. Please update your credentials.";
              break;
            case "INSTITUTION_DOWN":
              errorMessage =
                "The bank is currently unavailable. Please try again later.";
              break;
            case "INVALID_REQUEST":
              errorMessage =
                "There was an issue with the request. Please try a different date range.";
              break;
          }
        }
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Calculate balance history from transactions and current balance
 */
function calculateBalanceHistory(
  transactions: PlaidTransactionSummary[],
  currentBalance: number,
  startDate: Date,
  endDate: Date,
  timeRange: "7d" | "30d" | "90d" | "1y"
): BalanceHistoryPoint[] {
  // Transactions should already be filtered for the correct account
  // Sort transactions by date, newest first
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Create a map of dates to track balance changes
  const balanceMap = new Map<string, number>();

  // Start with the current balance
  let runningBalance = currentBalance;

  // Work backwards from today, reversing transaction effects
  for (const transaction of sortedTransactions) {
    const txDate = new Date(transaction.date);
    const dateKey = txDate.toISOString().split("T")[0];

    // For expenses, add the amount to get the previous balance (reverse the subtraction)
    // For income, subtract the amount to get the previous balance (reverse the addition)
    if (transaction.amount > 0) {
      // Plaid reports expenses as positive amounts
      runningBalance += transaction.amount;
    } else {
      // Plaid reports income/credits as negative amounts
      runningBalance -= Math.abs(transaction.amount);
    }

    // Store the calculated balance for this date
    balanceMap.set(dateKey, runningBalance);
  }

  // Generate a list of all dates in the range
  const allDates: Date[] = [];
  const datePoints: BalanceHistoryPoint[] = [];

  // Determine the interval based on time range
  let interval = 1; // Default to daily
  if (timeRange === "90d") {
    interval = 3; // Every 3 days
  } else if (timeRange === "1y") {
    interval = 7; // Weekly
  }

  // Generate dates with appropriate intervals
  const current = new Date(startDate);
  while (current <= endDate) {
    allDates.push(new Date(current));
    current.setDate(current.getDate() + interval);
  }

  // Ensure the end date is included
  if (allDates[allDates.length - 1].getTime() !== endDate.getTime()) {
    allDates.push(new Date(endDate));
  }

  // For each date, find the nearest known balance or interpolate
  let lastKnownBalance = currentBalance;

  // Process dates from newest to oldest for accurate interpolation
  for (let i = allDates.length - 1; i >= 0; i--) {
    const date = allDates[i];
    const dateKey = date.toISOString().split("T")[0];

    if (balanceMap.has(dateKey)) {
      // We have a balance for this exact date
      lastKnownBalance = balanceMap.get(dateKey)!;
    }

    // Add to our results
    datePoints.unshift({
      date,
      balance: lastKnownBalance,
    });
  }

  return datePoints;
}
