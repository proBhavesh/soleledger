"use server";

import { auth } from "@/lib/auth";
import { db, Prisma } from "@/lib/db";
import { Transaction } from "@/lib/types/dashboard";
import type { TransactionFilters, GetEnrichedTransactionsResponse } from "@/lib/types/transactions";
import { transactionFiltersSchema } from "@/lib/types/transactions";
import { buildUserBusinessWhere } from "@/lib/utils/permission-helpers";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

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
): Promise<GetEnrichedTransactionsResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    logger.warn("Unauthorized transaction fetch attempt");
    return { success: false, error: "Unauthorized" };
  }

  // Validate limit and offset
  if (limit < 1 || limit > 100) {
    return { success: false, error: "Invalid limit. Must be between 1 and 100" };
  }
  
  if (offset < 0) {
    return { success: false, error: "Invalid offset. Must be non-negative" };
  }

  const userId = session.user.id;

  try {
    // Ensure filters are resolved if they're Promises
    const resolvedFilters = await resolveFilters(filters);
    
    // Validate filters if provided
    let validatedFilters: z.infer<typeof transactionFiltersSchema> | undefined;
    if (resolvedFilters) {
      const validation = transactionFiltersSchema.safeParse(resolvedFilters);
      if (!validation.success) {
        logger.warn("Invalid transaction filters:", validation.error.errors);
        return { success: false, error: "Invalid filter parameters" };
      }
      validatedFilters = validation.data;
    }
    // Get active business for the user (including member businesses for accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(userId),
    });

    if (!business) {
      logger.warn(`No business found for user ${userId}`);
      return { success: false, error: "No business found" };
    }

    // Build the where clause with filters
    const where: Prisma.TransactionWhereInput = { businessId: business.id };

    // Add category filter if provided
    if (validatedFilters?.category && validatedFilters.category !== "all") {
      where.category = {
        name: validatedFilters.category,
      };
    }

    // Add search filter if provided (with sanitization)
    if (validatedFilters?.search) {
      const sanitizedSearch = validatedFilters.search.trim();
      where.OR = [
        {
          description: {
            contains: sanitizedSearch,
            mode: "insensitive",
          },
        },
        { notes: { contains: sanitizedSearch, mode: "insensitive" } },
      ];
    }

    // Add date range filter if provided
    if (validatedFilters?.dateFrom || validatedFilters?.dateTo) {
      where.date = {};

      if (validatedFilters.dateFrom) {
        where.date.gte = new Date(validatedFilters.dateFrom);
      }

      if (validatedFilters.dateTo) {
        // Add end of day to include the entire day
        const endDate = new Date(validatedFilters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    // Add bank account filter if provided
    if (validatedFilters?.accountId && validatedFilters.accountId !== "all") {
      where.bankAccountId = validatedFilters.accountId;
    }

    // Add transaction type filter if provided
    if (validatedFilters?.type && validatedFilters.type !== "ALL") {
      where.type = validatedFilters.type as Prisma.EnumTransactionTypeFilter;
    }

    // Add amount range filters if provided
    if (validatedFilters?.minAmount || validatedFilters?.maxAmount) {
      where.amount = {};

      if (validatedFilters.minAmount) {
        const minAmount = parseFloat(validatedFilters.minAmount);
        if (!isNaN(minAmount) && minAmount >= 0) {
          where.amount.gte = minAmount;
        }
      }

      if (validatedFilters.maxAmount) {
        const maxAmount = parseFloat(validatedFilters.maxAmount);
        if (!isNaN(maxAmount) && maxAmount >= 0) {
          where.amount.lte = maxAmount;
        }
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

    // Get total count with same filters
    const total = await db.transaction.count({
      where,
    });

    return {
      success: true,
      transactions: formattedTransactions,
      total,
    };
  } catch (error) {
    logger.error("Error getting enriched transactions:", error);
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
