"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  plaidClient,
  TRANSACTION_SYNC_OPTIONS,
  TRANSACTION_HISTORY_DAYS,
} from "@/lib/plaid/client";
import { TransactionsSyncRequest } from "plaid";
import { revalidatePath } from "next/cache";

/**
 * Syncs transactions for a connected account with enriched data
 */
export async function syncTransactionsEnhanced(
  accessToken: string,
  businessId: string,
  userId: string
) {
  try {
    const now = new Date();
    const historyStartDate = new Date();
    historyStartDate.setDate(
      historyStartDate.getDate() - TRANSACTION_HISTORY_DAYS
    );

    // Start with initial sync
    const initialSyncRequest: TransactionsSyncRequest = {
      access_token: accessToken,
      options: {
        include_personal_finance_category:
          TRANSACTION_SYNC_OPTIONS.include_personal_finance_category,
        include_original_description:
          TRANSACTION_SYNC_OPTIONS.include_original_description,
        // Note: include_logo_and_merchant_information is not part of official type
        // We're keeping it commented out until Plaid updates their types
        // include_logo_and_merchant_information:
        //   TRANSACTION_SYNC_OPTIONS.include_logo_and_merchant_information,
      },
    };

    // Use the sync endpoint instead of transactionsGet for better performance and data enrichment
    let hasMore = true;
    let cursor = "";

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

    while (hasMore) {
      // If we have a cursor from a previous call, use it
      if (cursor) {
        initialSyncRequest.cursor = cursor;
      }

      const syncResponse = await plaidClient.transactionsSync(
        initialSyncRequest
      );
      const data = syncResponse.data;

      // Process added transactions with enriched data
      for (const transaction of data.added) {
        // Skip pending transactions
        if (transaction.pending) continue;

        // Skip transactions outside our date range
        const transactionDate = new Date(transaction.date);
        if (transactionDate < historyStartDate) continue;

        // Check if transaction already exists
        const existingTransaction = await db.transaction.findFirst({
          where: {
            externalId: transaction.transaction_id,
            businessId,
          },
        });

        if (!existingTransaction) {
          // Determine transaction type and account type based on amount
          const transactionType = transaction.amount > 0 ? "EXPENSE" : "INCOME";
          const accountType = transaction.amount > 0 ? "EXPENSE" : "INCOME";

          // Get personal finance category if available
          let categoryId: string | undefined = undefined;
          if (transaction.personal_finance_category) {
            // Try to find a matching category in our system
            const category = await db.category.findFirst({
              where: {
                businessId,
                name: transaction.personal_finance_category.detailed,
                accountType: accountType,
              },
            });

            if (category) {
              categoryId = category.id;
            } else {
              // Find the next available account code in the appropriate range
              const accountTypeRanges = {
                INCOME: { start: 4000, end: 4999 },
                EXPENSE: { start: 6000, end: 6999 },
              };

              const range = accountTypeRanges[accountType];

              // Find the highest existing account code in this range
              const existingCategories = await db.category.findMany({
                where: {
                  businessId,
                  accountType: accountType,
                  accountCode: {
                    gte: range.start.toString(),
                    lte: range.end.toString(),
                  },
                },
                orderBy: {
                  accountCode: "desc",
                },
                take: 1,
              });

              let nextAccountCode = range.start.toString();
              if (existingCategories.length > 0) {
                const lastCode = parseInt(existingCategories[0].accountCode);
                nextAccountCode = (lastCode + 1).toString();
              }

              // Create a new category based on Plaid's categorization
              const newCategory = await db.category.create({
                data: {
                  businessId,
                  accountCode: nextAccountCode,
                  name: transaction.personal_finance_category.detailed,
                  accountType: accountType,
                  description: `Imported from ${transaction.personal_finance_category.primary}`,
                  sortOrder: parseInt(nextAccountCode),
                  creatorId: userId,
                },
              });
              categoryId = newCategory.id;
            }
          }

          // Create new transaction with enriched data
          await db.transaction.create({
            data: {
              businessId,
              bankAccountId: bankAccount.id,
              categoryId,
              type: transactionType,
              amount: Math.abs(transaction.amount),
              currency: transaction.iso_currency_code ?? "CAD",
              date: new Date(transaction.date),
              description: transaction.merchant_name || transaction.name,
              notes: transaction.original_description,
              reference: transaction.payment_meta?.reference_number,
              externalId: transaction.transaction_id,
              createdById: userId,
              // Store additional enriched data as JSON in the notes field if not available in the schema
              // In a real implementation, you might want to extend your schema to store this data properly
              confidence: transaction.personal_finance_category
                ?.confidence_level
                ? parseFloat(
                    transaction.personal_finance_category.confidence_level
                  )
                : undefined,
            },
          });
        }
      }

      // Handle modified transactions
      for (const transaction of data.modified) {
        const existingTransaction = await db.transaction.findFirst({
          where: {
            externalId: transaction.transaction_id,
            businessId,
          },
        });

        if (existingTransaction) {
          // Determine transaction type based on amount
          const type = transaction.amount > 0 ? "EXPENSE" : "INCOME";

          // Update the transaction with the latest data
          await db.transaction.update({
            where: {
              id: existingTransaction.id,
            },
            data: {
              amount: Math.abs(transaction.amount),
              currency:
                transaction.iso_currency_code ?? existingTransaction.currency,
              date: new Date(transaction.date),
              description: transaction.merchant_name || transaction.name,
              notes: transaction.original_description,
              type,
            },
          });
        }
      }

      // Handle removed transactions
      for (const transactionId of data.removed) {
        const existingTransaction = await db.transaction.findFirst({
          where: {
            externalId: transactionId.transaction_id,
            businessId,
          },
        });

        if (existingTransaction) {
          // Mark transaction as deleted or handle accordingly
          // For this implementation, we'll flag it rather than deleting
          await db.transaction.update({
            where: {
              id: existingTransaction.id,
            },
            data: {
              isFlagged: true,
              notes: existingTransaction.notes
                ? `${existingTransaction.notes} (Removed by bank)`
                : "Removed by bank",
            },
          });
        }
      }

      // Update cursor and hasMore for next iteration
      hasMore = data.has_more;
      cursor = data.next_cursor;
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
 * Manually refreshes transactions for a bank account
 */
export async function refreshTransactions(bankAccountId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  try {
    // Get the bank account
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        userId,
      },
    });

    if (!bankAccount || !bankAccount.plaidAccessToken) {
      throw new Error("Bank account not found or not connected to Plaid");
    }

    // Trigger a refresh for the account
    await plaidClient.transactionsRefresh({
      access_token: bankAccount.plaidAccessToken,
    });

    // After triggering the refresh, sync the transactions
    await syncTransactionsEnhanced(
      bankAccount.plaidAccessToken,
      bankAccount.businessId,
      userId
    );

    // Also refresh recurring transactions
    const { syncRecurringTransactions } = await import("./recurring");
    await syncRecurringTransactions(bankAccount.plaidAccessToken);

    // Update last sync time
    await db.bankAccount.update({
      where: {
        id: bankAccount.id,
      },
      data: {
        lastSync: new Date(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");

    return { success: true, message: "Transactions refreshed successfully" };
  } catch (error) {
    console.error("Error refreshing transactions:", error);
    return {
      success: false,
      error: "Failed to refresh transactions. Please try again later.",
    };
  }
}

/**
 * Legacy function for backward compatibility
 * Use syncTransactionsEnhanced instead for new code
 */
export async function syncTransactions(
  accessToken: string,
  businessId: string,
  userId: string
) {
  return syncTransactionsEnhanced(accessToken, businessId, userId);
}

/**
 * Sync all bank accounts for a user in the background
 * This is designed to be non-blocking and runs async
 */
export async function syncAllBankAccountsInBackground() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    // Get user's business
    const business = await db.business.findFirst({
      where: {
        ownerId: userId,
      },
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Get all bank accounts that need syncing
    const bankAccounts = await db.bankAccount.findMany({
      where: {
        businessId: business.id,
        userId,
        plaidAccessToken: {
          not: null,
        },
      },
    });

    // Check if any accounts need syncing (haven't been synced in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const accountsToSync = bankAccounts.filter(
      account => !account.lastSync || account.lastSync < fiveMinutesAgo
    );

    if (accountsToSync.length === 0) {
      return { success: true, message: "All accounts recently synced" };
    }

    // Start sync for each account in parallel but don't wait
    // Using Promise.allSettled to handle individual failures gracefully
    Promise.allSettled(
      accountsToSync.map(async (account) => {
        try {
          if (account.plaidAccessToken) {
            // Trigger a refresh for the account
            await plaidClient.transactionsRefresh({
              access_token: account.plaidAccessToken,
            });

            // Sync the transactions
            await syncTransactionsEnhanced(
              account.plaidAccessToken,
              account.businessId,
              userId
            );

            // Update last sync time
            await db.bankAccount.update({
              where: { id: account.id },
              data: { lastSync: new Date() },
            });
          }
        } catch (error) {
          console.error(`Failed to sync bank account ${account.id}:`, error);
          // Don't throw - let other accounts continue syncing
        }
      })
    ).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      console.log(`Background sync completed: ${successful} successful, ${failed} failed`);
    });

    // Return immediately without waiting for sync to complete
    return { 
      success: true, 
      message: `Started background sync for ${accountsToSync.length} accounts` 
    };
  } catch (error) {
    console.error("Error initiating background sync:", error);
    return {
      success: false,
      error: "Failed to start background sync",
    };
  }
}
