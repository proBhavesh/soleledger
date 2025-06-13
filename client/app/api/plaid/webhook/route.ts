import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid/client";
import { db } from "@/lib/db";
import { WebhookType } from "plaid";

// Webhook code types as strings since they're not directly exported from the Plaid library
type TransactionWebhookCode =
  | "INITIAL_UPDATE"
  | "HISTORICAL_UPDATE"
  | "DEFAULT_UPDATE"
  | "TRANSACTIONS_REMOVED";

type ItemWebhookCode =
  | "ERROR"
  | "PENDING_EXPIRATION"
  | "USER_PERMISSION_REVOKED"
  | "NEW_ACCOUNTS_AVAILABLE";

type WebhookCode = TransactionWebhookCode | ItemWebhookCode | string;

interface PlaidWebhookPayload {
  webhook_type: WebhookType;
  webhook_code: string;
  item_id: string;
  error?: {
    display_message?: string;
    error_code?: string;
    error_message?: string;
    error_type?: string;
  };
  removed_transactions?: string[];
  [key: string]: unknown;
}

interface BankAccountWithAccess {
  id: string;
  businessId: string;
  userId: string;
  plaidAccessToken: string;
  plaidItemId: string;
  [key: string]: unknown;
}

/**
 * Handles Plaid webhooks for transaction updates, item status changes, etc.
 *
 * For complete documentation on Plaid webhooks, see:
 * https://plaid.com/docs/api/webhooks/
 *
 * @param req The incoming webhook request from Plaid
 */
export async function POST(req: NextRequest) {
  try {
    // In production environments, uncomment and implement this:
    // Verify Plaid webhook signature if in production
    // const headersList = headers();
    // const plaidWebhookSignature = headersList.get('plaid-verification');
    // ... verification logic here

    // Parse the webhook payload
    const payload = (await req.json()) as PlaidWebhookPayload;

    // Destructure relevant fields from the payload
    const { webhook_type, webhook_code, item_id, error } = payload;

    // Log the webhook for debugging
    console.log("Received Plaid webhook:", {
      webhook_type,
      webhook_code,
      item_id,
      error: error ? JSON.stringify(error) : undefined,
    });

    // Handle different webhook types
    switch (webhook_type as WebhookType) {
      case "TRANSACTIONS":
        await handleTransactionsWebhook(
          webhook_code as WebhookCode,
          item_id,
          payload
        );
        break;

      case "ITEM":
        await handleItemWebhook(webhook_code as WebhookCode, item_id, payload);
        break;

      default:
        console.log(`Unhandled webhook type: ${webhook_type}`);
    }

    // Return success
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Plaid webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * Handles transaction-related webhooks
 */
async function handleTransactionsWebhook(
  webhookCode: WebhookCode,
  itemId: string,
  payload: PlaidWebhookPayload
) {
  try {
    // Find the bank account with this Plaid Item ID
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        plaidItemId: itemId,
      },
    });

    if (!bankAccount) {
      console.error(`No bank account found for Plaid Item ID: ${itemId}`);
      return;
    }

    // Handle different transaction webhook codes
    switch (webhookCode) {
      case "INITIAL_UPDATE":
      case "HISTORICAL_UPDATE":
      case "DEFAULT_UPDATE": {
        // Sync transactions from Plaid
        await syncTransactions(bankAccount as BankAccountWithAccess);
        break;
      }

      case "TRANSACTIONS_REMOVED": {
        // Handle removed transactions
        const { removed_transactions } = payload;
        if (removed_transactions && Array.isArray(removed_transactions)) {
          await removeTransactions(
            bankAccount.businessId,
            removed_transactions
          );
        }
        break;
      }

      default:
        console.log(`Unhandled transactions webhook code: ${webhookCode}`);
    }
  } catch (error) {
    console.error("Error handling transactions webhook:", error);
    throw error;
  }
}

/**
 * Handles item-related webhooks (auth status, errors, etc.)
 */
async function handleItemWebhook(
  webhookCode: WebhookCode,
  itemId: string,
  payload: PlaidWebhookPayload
) {
  try {
    // Find the bank account with this Plaid Item ID
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        plaidItemId: itemId,
      },
    });

    if (!bankAccount) {
      console.error(`No bank account found for Plaid Item ID: ${itemId}`);
      return;
    }

    // Handle different item webhook codes
    switch (webhookCode) {
      case "ERROR": {
        // Handle Plaid API errors
        console.error("Plaid Item error:", payload.error);
        break;
      }

      case "PENDING_EXPIRATION": {
        // Handle upcoming access token expiration
        // You might want to notify the user to reconnect their account
        console.log(`Access token for item ${itemId} is pending expiration`);
        break;
      }

      default:
        console.log(`Unhandled item webhook code: ${webhookCode}`);
    }
  } catch (error) {
    console.error("Error handling item webhook:", error);
    throw error;
  }
}

/**
 * Syncs transactions for a bank account
 */
async function syncTransactions(bankAccount: BankAccountWithAccess) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const response = await plaidClient.transactionsGet({
      access_token: bankAccount.plaidAccessToken,
      start_date: thirtyDaysAgo.toISOString().split("T")[0],
      end_date: now.toISOString().split("T")[0],
    });

    const transactions = response.data.transactions;

    // Process transactions
    for (const transaction of transactions) {
      // Skip pending transactions
      if (transaction.pending) continue;

      // Check if transaction already exists
      const existingTransaction = await db.transaction.findFirst({
        where: {
          externalId: transaction.transaction_id,
          businessId: bankAccount.businessId,
        },
      });

      if (!existingTransaction) {
        // Create new transaction
        await db.transaction.create({
          data: {
            businessId: bankAccount.businessId,
            bankAccountId: bankAccount.id,
            type: transaction.amount > 0 ? "EXPENSE" : "INCOME",
            amount: Math.abs(transaction.amount),
            currency: transaction.iso_currency_code ?? "CAD",
            date: new Date(transaction.date),
            description: transaction.name,
            reference: transaction.payment_meta?.reference_number,
            externalId: transaction.transaction_id,
            createdById: bankAccount.userId,
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
    throw error;
  }
}

/**
 * Removes transactions that were deleted in Plaid
 */
async function removeTransactions(
  businessId: string,
  transactionIds: string[]
) {
  try {
    await db.transaction.deleteMany({
      where: {
        businessId,
        externalId: {
          in: transactionIds,
        },
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error removing transactions:", error);
    throw error;
  }
}
