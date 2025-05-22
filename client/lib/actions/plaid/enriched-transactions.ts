"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Transaction } from "@/lib/types/dashboard";
import { TransactionWhereInput } from "@/lib/types/database";

interface TransactionFilters {
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Ensures filter params are resolved if they're Promises
 */
async function resolveFilters(
  filters?: TransactionFilters
): Promise<TransactionFilters | undefined> {
  if (!filters) return undefined;

  const resolvedFilters: TransactionFilters = {};

  // Handle each field that might be a promise
  for (const [key, value] of Object.entries(filters)) {
    if (value instanceof Promise) {
      resolvedFilters[key as keyof TransactionFilters] = await value;
    } else {
      resolvedFilters[key as keyof TransactionFilters] = value;
    }
  }

  return resolvedFilters;
}

/**
 * Get enriched transactions with merchant information and enhanced categories
 */
export async function getEnrichedTransactions(
  limit: number = 10,
  offset: number = 0,
  filters?: TransactionFilters
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Ensure filters are resolved if they're Promises
  const resolvedFilters = await resolveFilters(filters);

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

    // Build the where clause with filters
    const where: TransactionWhereInput = { businessId: business.id };

    // Add category filter if provided
    if (resolvedFilters?.category) {
      where.category = {
        name: resolvedFilters.category,
      };
    }

    // Add search filter if provided
    if (resolvedFilters?.search) {
      where.OR = [
        {
          description: {
            contains: resolvedFilters.search,
            mode: "insensitive",
          },
        },
        { notes: { contains: resolvedFilters.search, mode: "insensitive" } },
      ];
    }

    // Add date range filter if provided
    if (resolvedFilters?.dateFrom || resolvedFilters?.dateTo) {
      where.date = {};

      if (resolvedFilters.dateFrom) {
        where.date.gte = new Date(resolvedFilters.dateFrom);
      }

      if (resolvedFilters.dateTo) {
        where.date.lte = new Date(resolvedFilters.dateTo);
      }
    }

    // Get transactions with their categories and bank accounts
    const transactions = await db.transaction.findMany({
      where,
      include: {
        category: true,
        bankAccount: true,
      },
      orderBy: {
        date: "desc",
      },
      take: limit,
      skip: offset,
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
        // Enhanced fields
        merchantName: transaction.description || null,
        originalDescription: transaction.notes || null,
        pending: false,
        categoryConfidence: transaction.confidence || null,
        subcategory: transaction.category?.description || null,
        accountId: transaction.bankAccountId || null,
        accountName: transaction.bankAccount?.name || null,
      })
    );

    return {
      success: true,
      transactions: formattedTransactions,
      total: await db.transaction.count({
        where: { businessId: business.id },
      }),
    };
  } catch (error) {
    console.error("Error getting enriched transactions:", error);
    return {
      success: false,
      error: "Failed to get transactions. Please try again later.",
    };
  }
}

/**
 * Get transaction details by ID with enhanced information
 */
export async function getTransactionDetails(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    // Get the transaction with related data
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
        OR: [
          { createdById: userId },
          {
            business: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
      include: {
        category: true,
        bankAccount: true,
        documents: true,
      },
    });

    if (!transaction) {
      return {
        success: false,
        error: "Transaction not found or you don't have access",
      };
    }

    // Format transaction with enriched data
    const enrichedTransaction: Transaction = {
      id: transaction.id,
      description: transaction.description || "",
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date,
      category: transaction.category?.name || "Uncategorized",
      // Enhanced fields
      merchantName: transaction.description || null,
      originalDescription: transaction.notes || null,
      pending: false,
      categoryConfidence: transaction.confidence || null,
      subcategory: transaction.category?.description || null,
      accountId: transaction.bankAccountId || null,
      accountName: transaction.bankAccount?.name || null,
      // Additional details
      locationCity: null, // Would need to be extracted from location data if available
      locationRegion: null,
      paymentChannel: null, // Would come from Plaid's payment_channel field
    };

    return {
      success: true,
      transaction: enrichedTransaction,
      documents: transaction.documents,
    };
  } catch (error) {
    console.error("Error getting transaction details:", error);
    return {
      success: false,
      error: "Failed to get transaction details. Please try again later.",
    };
  }
}
