"use server";

import { db } from "@/lib/db";
import {
  plaidClient,
  TRANSACTION_SYNC_OPTIONS,
  TRANSACTION_HISTORY_DAYS,
} from "@/lib/plaid/client";
import { TransactionsSyncRequest } from "plaid";
import type { Transaction as PlaidTransaction } from "plaid";
import type { Prisma } from "@/generated/prisma";

interface CategoryCache {
  [key: string]: string; // categoryName -> categoryId
}

interface TransactionBatch {
  transactions: Prisma.TransactionCreateManyInput[];
  categories: Prisma.CategoryCreateManyInput[];
}

/**
 * Optimized sync transactions with batch operations and parallel processing
 */
export async function syncTransactionsOptimized(
  accessToken: string,
  businessId: string,
  userId: string
) {
  const startTime = Date.now();
  console.log("[Sync] Starting optimized transaction sync");

  try {
    const historyStartDate = new Date();
    historyStartDate.setDate(historyStartDate.getDate() - TRANSACTION_HISTORY_DAYS);

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

    // Pre-fetch all existing categories for this business to build cache
    const existingCategories = await db.category.findMany({
      where: { businessId },
      select: { id: true, name: true, accountType: true },
    });

    // Build category cache
    const categoryCache: CategoryCache = {};
    existingCategories.forEach(cat => {
      const key = `${cat.accountType}:${cat.name}`;
      categoryCache[key] = cat.id;
    });

    // Fetch all transactions from Plaid
    const allTransactions = await fetchAllTransactions(accessToken);
    console.log(`[Sync] Fetched ${allTransactions.length} transactions from Plaid`);

    // Filter out pending transactions and those outside date range
    const validTransactions = allTransactions.filter(
      t => !t.pending && new Date(t.date) >= historyStartDate
    );

    // Get all existing transaction IDs in a single query
    const existingTransactionIds = await db.transaction.findMany({
      where: {
        businessId,
        externalId: { in: validTransactions.map(t => t.transaction_id) },
      },
      select: { externalId: true },
    });

    const existingIdSet = new Set(existingTransactionIds.map(t => t.externalId));

    // Process transactions in parallel batches
    const BATCH_SIZE = 100;
    const batches: TransactionBatch[] = [];
    
    for (let i = 0; i < validTransactions.length; i += BATCH_SIZE) {
      const batch = validTransactions.slice(i, i + BATCH_SIZE);
      const processedBatch = await processBatch(
        batch,
        existingIdSet,
        categoryCache,
        businessId,
        userId,
        bankAccount.id
      );
      batches.push(processedBatch);
    }

    // Combine all batches
    const allNewTransactions = batches.flatMap(b => b.transactions);
    const allNewCategories = batches.flatMap(b => b.categories);

    console.log(`[Sync] Processing ${allNewTransactions.length} new transactions`);
    console.log(`[Sync] Creating ${allNewCategories.length} new categories`);

    // Bulk insert operations in a transaction
    await db.$transaction(async (tx) => {
      // Create all new categories first
      if (allNewCategories.length > 0) {
        await tx.category.createMany({
          data: allNewCategories,
          skipDuplicates: true,
        });
      }

      // Create all transactions
      if (allNewTransactions.length > 0) {
        await tx.transaction.createMany({
          data: allNewTransactions,
          skipDuplicates: true,
        });
      }

      // Update bank account last sync
      await tx.bankAccount.update({
        where: { id: bankAccount.id },
        data: { lastSync: new Date() },
      });
    });

    const endTime = Date.now();
    console.log(`[Sync] Completed in ${endTime - startTime}ms`);

    return { 
      success: true, 
      transactionsAdded: allNewTransactions.length,
      duration: endTime - startTime 
    };
  } catch (error) {
    console.error("[Sync] Error:", error);
    throw new Error("Failed to sync transactions");
  }
}

/**
 * Fetch all transactions using cursor pagination.
 * Uses Plaid's cursor-based sync API to retrieve all available transactions.
 */
async function fetchAllTransactions(
  accessToken: string
): Promise<PlaidTransaction[]> {
  const allTransactions: PlaidTransaction[] = [];
  let hasMore = true;
  let cursor = "";

  const request: TransactionsSyncRequest = {
    access_token: accessToken,
    options: {
      include_personal_finance_category: TRANSACTION_SYNC_OPTIONS.include_personal_finance_category,
      include_original_description: TRANSACTION_SYNC_OPTIONS.include_original_description,
    },
  };

  while (hasMore) {
    if (cursor) {
      request.cursor = cursor;
    }

    const response = await plaidClient.transactionsSync(request);
    const data = response.data;

    allTransactions.push(...data.added);
    
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  return allTransactions;
}

/**
 * Process a batch of transactions in parallel
 */
async function processBatch(
  transactions: PlaidTransaction[],
  existingIds: Set<string | null>,
  categoryCache: CategoryCache,
  businessId: string,
  userId: string,
  bankAccountId: string
): Promise<TransactionBatch> {
  const newTransactions: Prisma.TransactionCreateManyInput[] = [];
  const categoriesToCreate = new Map<string, Prisma.CategoryCreateManyInput>();

  // Get the highest account codes for each type in parallel
  const [highestIncomeCode, highestExpenseCode] = await Promise.all([
    getHighestAccountCode(businessId, "INCOME"),
    getHighestAccountCode(businessId, "EXPENSE"),
  ]);

  let nextIncomeCode = highestIncomeCode;
  let nextExpenseCode = highestExpenseCode;

  // Process each transaction
  for (const transaction of transactions) {
    // Skip if already exists
    if (existingIds.has(transaction.transaction_id)) continue;

    const transactionType = transaction.amount > 0 ? "EXPENSE" : "INCOME";
    const accountType = transactionType === "EXPENSE" ? "EXPENSE" : "INCOME";

    // Find or prepare category
    let categoryId: string | undefined;
    
    if (transaction.personal_finance_category) {
      const categoryName = transaction.personal_finance_category.detailed;
      const cacheKey = `${accountType}:${categoryName}`;
      
      categoryId = categoryCache[cacheKey];
      
      if (!categoryId && !categoriesToCreate.has(cacheKey)) {
        // Generate new category ID and code
        const categoryId = generateCuid();
        const accountCode = accountType === "INCOME" 
          ? (++nextIncomeCode).toString()
          : (++nextExpenseCode).toString();

        const newCategory: Prisma.CategoryCreateManyInput = {
          id: categoryId,
          businessId,
          accountCode,
          name: categoryName,
          accountType,
          description: `Imported from ${transaction.personal_finance_category.primary}`,
          sortOrder: parseInt(accountCode),
          creatorId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        categoriesToCreate.set(cacheKey, newCategory);
        categoryCache[cacheKey] = categoryId;
      }
      
      categoryId = categoryCache[cacheKey];
    }

    // Create transaction object
    const newTransaction: Prisma.TransactionCreateManyInput = {
      id: generateCuid(),
      businessId,
      bankAccountId,
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
      confidence: transaction.personal_finance_category?.confidence_level
        ? parseFloat(transaction.personal_finance_category.confidence_level)
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    newTransactions.push(newTransaction);
  }

  return {
    transactions: newTransactions,
    categories: Array.from(categoriesToCreate.values()),
  };
}

/**
 * Get the highest account code for a given account type
 */
async function getHighestAccountCode(
  businessId: string,
  accountType: "INCOME" | "EXPENSE"
): Promise<number> {
  const range = accountType === "INCOME" 
    ? { start: 4000, end: 4999 }
    : { start: 6000, end: 6999 };

  const highestCategory = await db.category.findFirst({
    where: {
      businessId,
      accountType,
      accountCode: {
        gte: range.start.toString(),
        lte: range.end.toString(),
      },
    },
    orderBy: { accountCode: "desc" },
    select: { accountCode: true },
  });

  return highestCategory 
    ? parseInt(highestCategory.accountCode)
    : range.start - 1;
}

/**
 * Generate a CUID using the same method as Prisma
 */
function generateCuid(): string {
  // Generate a proper CUID format
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  const counter = Math.floor(Math.random() * 1679616).toString(36); // 36^4
  return `c${timestamp}${randomPart}${counter}`.substring(0, 25);
}