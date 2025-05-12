"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  plaidClient,
  PLAID_PRODUCTS,
  PLAID_COUNTRY_CODES,
  PLAID_REDIRECT_URI,
} from "@/lib/plaid/client";
import { Products, CountryCode, LinkTokenCreateRequest } from "plaid";
import { revalidatePath } from "next/cache";
import { PlaidErrorDetails, PlaidErrorObject } from "@/lib/types";

/**
 * Creates a Plaid Link token for a user to connect their bank account
 */
export async function createLinkToken() {
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
    throw new Error("No business found");
  }

  const request: LinkTokenCreateRequest = {
    user: {
      client_user_id: userId,
    },
    client_name: "SoleLedger",
    products: [...PLAID_PRODUCTS] as Products[],
    language: "en",
    country_codes: [...PLAID_COUNTRY_CODES] as CountryCode[],
    webhook: process.env.PLAID_WEBHOOK_URL,
    redirect_uri: PLAID_REDIRECT_URI,
  };

  // Log the request for debugging (sanitize any sensitive data)
  console.log("Plaid Link Token Request:", {
    client_user_id: userId,
    client_name: "SoleLedger",
    products: PLAID_PRODUCTS,
    language: "en",
    country_codes: PLAID_COUNTRY_CODES,
    webhook: process.env.PLAID_WEBHOOK_URL,
    redirect_uri: PLAID_REDIRECT_URI,
  });

  try {
    const response = await plaidClient.linkTokenCreate(request);
    console.log("Plaid Link Token Response (success):", {
      expiration: response.data.expiration,
      request_id: response.data.request_id,
      link_token_exists: !!response.data.link_token,
    });

    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
      businessId: business.id,
    };
  } catch (error: unknown) {
    // Extract and log detailed error information
    console.error("Error creating link token:", error);

    const plaidError = error as PlaidErrorObject;

    // Create properly typed error details object
    const errorDetails: PlaidErrorDetails = {
      message: plaidError.message || "Unknown error",
      type: plaidError.constructor?.name || "Error",
    };

    // If it's an Axios error, extract more details
    if (plaidError.isAxiosError) {
      const response = plaidError.response || {};

      // Now we can safely add these properties as they're defined in the interface
      errorDetails.status = response.status;
      errorDetails.statusText = response.statusText;
      errorDetails.method = plaidError.config?.method;
      errorDetails.url = plaidError.config?.url;
      errorDetails.responseData = response.data;
      errorDetails.requestId =
        response.headers?.["x-request-id"] || response.headers?.["request-id"];
      errorDetails.plaidError =
        response.data?.error_code || response.data?.error_message;
      errorDetails.plaidErrorType = response.data?.error_type;

      // Log the full error response for debugging
      console.error(
        "Plaid API Error Details:",
        JSON.stringify(errorDetails, null, 2)
      );
    }

    throw new Error(
      `Failed to create Plaid link token: ${errorDetails.message}`
    );
  }
}

/**
 * Exchanges a public token for an access token and stores it in the database
 */
export async function exchangePublicToken(
  publicToken: string,
  businessId: string,
  metadata: {
    institution?: {
      name: string;
      id: string;
    };
    accounts: Array<{
      id: string;
      name: string;
      mask: string;
      type: string;
      subtype: string;
    }>;
  }
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  try {
    // Exchange public token for access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = tokenResponse.data.access_token;
    const itemId = tokenResponse.data.item_id;

    // Get account balances
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    // Add bank accounts to the database
    for (const account of accountsResponse.data.accounts) {
      // Find matching account in metadata
      const metadataAccount = metadata.accounts.find(
        (a) => a.id === account.account_id
      );

      if (metadataAccount) {
        await db.bankAccount.create({
          data: {
            name: account.name,
            balance: account.balances.current ?? 0,
            currency: account.balances.iso_currency_code ?? "USD",
            accountNumber: account.mask ? `****${account.mask}` : undefined,
            institution: metadata.institution?.name ?? "Unknown Bank",
            plaidItemId: itemId,
            plaidAccessToken: accessToken,
            lastSync: new Date(),
            businessId,
            userId,
          },
        });
      }
    }

    // Sync transactions (basic implementation)
    await syncTransactions(accessToken, businessId, userId);

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error exchanging public token:", error);
    throw new Error("Failed to connect bank account");
  }
}

/**
 * Syncs transactions for a connected account
 */
async function syncTransactions(
  accessToken: string,
  businessId: string,
  userId: string
) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: thirtyDaysAgo.toISOString().split("T")[0],
      end_date: now.toISOString().split("T")[0],
    });

    const transactions = response.data.transactions;

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

    // Process transactions
    for (const transaction of transactions) {
      // Skip pending transactions
      if (transaction.pending) continue;

      // Check if transaction already exists
      const existingTransaction = await db.transaction.findFirst({
        where: {
          externalId: transaction.transaction_id,
          businessId,
        },
      });

      if (!existingTransaction) {
        // Create new transaction
        await db.transaction.create({
          data: {
            businessId,
            bankAccountId: bankAccount.id,
            type: transaction.amount > 0 ? "EXPENSE" : "INCOME",
            amount: Math.abs(transaction.amount),
            currency: transaction.iso_currency_code ?? "USD",
            date: new Date(transaction.date),
            description: transaction.name,
            reference: transaction.payment_meta?.reference_number,
            externalId: transaction.transaction_id,
            createdById: userId,
          },
        });
      }
    }

    // Update last sync time
    await db.bankAccount.update({
      where: {
        id: bankAccount.id,
      },
      data: {
        lastSync: now,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error syncing transactions:", error);
    throw new Error("Failed to sync transactions");
  }
}

/**
 * Gets all bank accounts for the current user's business
 */
export async function getBankAccounts() {
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
    return [];
  }

  const accounts = await db.bankAccount.findMany({
    where: {
      businessId: business.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return { accounts, businessId: business.id };
}

/**
 * Gets the financial summary for the dashboard
 */
export async function getFinancialSummary() {
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
    return {
      totalIncome: 0,
      totalExpenses: 0,
      pendingReceipts: 0,
      totalBalance: 0,
      recentTransactions: [],
      hasConnectedAccounts: false,
    };
  }

  // Get bank accounts
  const accounts = await db.bankAccount.findMany({
    where: {
      businessId: business.id,
    },
  });

  // Check if has connected accounts
  const hasConnectedAccounts = accounts.length > 0;

  // Calculate total balance
  const totalBalance = accounts.reduce(
    (sum, account) => sum + (account.balance || 0),
    0
  );

  // Get transactions
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await db.transaction.findMany({
    where: {
      businessId: business.id,
      date: {
        gte: thirtyDaysAgo,
      },
    },
    orderBy: {
      date: "desc",
    },
    take: 20,
    include: {
      category: true,
    },
  });

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  // Get pending receipts
  const pendingReceipts = await db.document.count({
    where: {
      businessId: business.id,
      transactionId: null,
      type: "RECEIPT",
    },
  });

  // Get recent transactions for display
  const recentTransactions = transactions.slice(0, 5).map((t) => ({
    id: t.id,
    description: t.description || "Unnamed Transaction",
    amount: t.amount,
    type: t.type,
    date: t.date,
    category: t.category?.name || "Uncategorized",
  }));

  return {
    totalIncome,
    totalExpenses,
    pendingReceipts,
    totalBalance,
    recentTransactions,
    hasConnectedAccounts,
  };
}
