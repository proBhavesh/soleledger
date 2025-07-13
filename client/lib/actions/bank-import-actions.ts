"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "./business-context-actions";
import { checkTransactionLimit } from "@/lib/services/usage-tracking";
import { TransactionProcessor } from "@/lib/services/transaction-processor";
import type { JournalEntryAccountIds } from "@/lib/types/bank-imports";

export interface BankTransactionData {
  date: string;
  description: string;
  amount: number;
  category?: string;
  reference?: string;
  notes?: string;
}

export interface BulkImportBankTransactionsRequest {
  bankAccountId: string;
  transactions: BankTransactionData[];
}

export interface BulkImportResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  failedCount: number;
  errors?: Array<{ row: number; error: string }>;
  transactionIds?: string[];
}

/**
 * Import multiple bank transactions from CSV/Excel data
 */
export async function bulkImportBankTransactions(
  request: BulkImportBankTransactionsRequest
): Promise<BulkImportResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        totalCount: request.transactions.length,
        successCount: 0,
        failedCount: request.transactions.length,
        errors: [{ row: 0, error: "Unauthorized" }],
      };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return {
        success: false,
        totalCount: request.transactions.length,
        successCount: 0,
        failedCount: request.transactions.length,
        errors: [{ row: 0, error: "No business selected" }],
      };
    }

    // Verify bank account belongs to business
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        id: request.bankAccountId,
        businessId,
      },
    });

    if (!bankAccount) {
      return {
        success: false,
        totalCount: request.transactions.length,
        successCount: 0,
        failedCount: request.transactions.length,
        errors: [{ row: 0, error: "Bank account not found" }],
      };
    }

    // Check transaction limits
    const usageCheck = await checkTransactionLimit(
      session.user.id,
      businessId,
      request.transactions.length
    );
    if (!usageCheck.allowed) {
      return {
        success: false,
        totalCount: request.transactions.length,
        successCount: 0,
        failedCount: request.transactions.length,
        errors: [
          {
            row: 0,
            error: usageCheck.message || "Transaction limit exceeded",
          },
        ],
      };
    }

    // Get account mappings for journal entries
    const accounts = await db.category.findMany({
      where: { businessId },
      select: { id: true, accountCode: true, accountType: true },
    });

    const accountMap: Record<string, string> = {};
    const journalAccountIds: Partial<JournalEntryAccountIds> = {};
    
    accounts.forEach(account => {
      // Map common expense accounts
      if (account.accountCode === "5020") {
        accountMap.miscellaneous = account.id;
        journalAccountIds.miscExpenseId = account.id;
      }
      if (account.accountCode === "5000") {
        accountMap.costOfGoodsSold = account.id;
        journalAccountIds.costOfGoodsSoldId = account.id;
      }
      if (account.accountCode === "5010") {
        accountMap.salariesWages = account.id;
        journalAccountIds.salariesWagesId = account.id;
      }
      if (account.accountCode === "5030") {
        accountMap.rent = account.id;
        journalAccountIds.rentExpenseId = account.id;
      }
      if (account.accountCode === "5040") {
        accountMap.utilities = account.id;
        journalAccountIds.utilitiesExpenseId = account.id;
      }
      // Map income accounts
      if (account.accountCode === "4000") {
        accountMap.salesRevenue = account.id;
        journalAccountIds.salesRevenueId = account.id;
      }
      if (account.accountCode === "4010") {
        accountMap.serviceRevenue = account.id;
        journalAccountIds.serviceRevenueId = account.id;
      }
      if (account.accountCode === "4030") {
        accountMap.otherIncome = account.id;
        journalAccountIds.otherIncomeId = account.id;
      }
      // Map asset accounts
      if (account.accountCode === "1000") {
        journalAccountIds.cashAccountId = account.id;
      }
    });

    // Create a dummy document for tracking
    const importDocument = await db.document.create({
      data: {
        businessId,
        userId: session.user.id,
        name: `bulk-import-${Date.now()}.csv`,
        type: "STATEMENT",
        url: "",
        size: 0,
        mimeType: "text/csv",
        originalFileName: `bulk-import-${Date.now()}.csv`,
        s3Key: `bulk-import-${Date.now()}`,
        processingStatus: "PROCESSING",
      },
    });

    // Import journal entry factory
    const { JournalEntryFactory } = await import("@/lib/accounting/journal-entry-factory");
    const journalFactory = new JournalEntryFactory(journalAccountIds as JournalEntryAccountIds);

    // Process transactions using TransactionProcessor for batch handling
    const processor = new TransactionProcessor({
      batchSize: 20,
      progressCallback: (progress) => {
        console.log(`Bank import progress: ${progress.processed}/${progress.total}`);
      },
    });

    const errors: Array<{ row: number; error: string }> = [];
    const successfulTransactionIds: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Convert transactions to the format expected by the processor
    const transactionsToProcess = request.transactions.map((txn, index) => ({
      date: new Date(txn.date),
      description: txn.description,
      amount: txn.amount,
      type: txn.amount >= 0 ? "INCOME" as const : "EXPENSE" as const,
      bankAccountId: request.bankAccountId,
      reference: txn.reference,
      businessId,
      categoryId: txn.category ? accountMap[txn.category.toLowerCase()] : undefined,
      rowIndex: index + 2, // +2 for header row and 1-based indexing
    }));

    // Process in batches
    const result = await processor.processTransactions(
      transactionsToProcess,
      {
        businessId,
        userId: session.user.id,
        documentId: importDocument.id,
        accountMap,
        journalFactory,
      }
    );

    // Collect results
    successCount = result.imported;
    failedCount = result.failed;
    successfulTransactionIds.push(...result.transactionIds);
    
    result.errors.forEach((error, index) => {
      errors.push({
        row: index + 2, // Default row number if not available
        error: error.message || error.error || "Unknown error",
      });
    });

    return {
      success: failedCount === 0,
      totalCount: request.transactions.length,
      successCount,
      failedCount,
      errors: errors.slice(0, 50), // Limit errors to first 50
      transactionIds: successfulTransactionIds,
    };
  } catch (error) {
    console.error("Bulk bank import error:", error);
    return {
      success: false,
      totalCount: request.transactions.length,
      successCount: 0,
      failedCount: request.transactions.length,
      errors: [
        {
          row: 0,
          error: error instanceof Error ? error.message : "Import failed",
        },
      ],
    };
  }
}

/**
 * Validate CSV/Excel data before import
 */
export async function validateBulkImportData(
  transactions: BankTransactionData[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (transactions.length === 0) {
    errors.push("No transactions to import");
    return { valid: false, errors };
  }

  if (transactions.length > 1000) {
    errors.push("Maximum 1000 transactions can be imported at once");
    return { valid: false, errors };
  }

  // Validate each transaction
  transactions.forEach((txn, index) => {
    const rowNum = index + 2; // +2 for header row and 1-based indexing

    // Validate date
    const date = new Date(txn.date);
    if (isNaN(date.getTime())) {
      errors.push(`Row ${rowNum}: Invalid date format`);
    }

    // Validate amount
    if (isNaN(txn.amount) || txn.amount === 0) {
      errors.push(`Row ${rowNum}: Invalid amount (must be non-zero number)`);
    }

    // Validate description
    if (!txn.description || txn.description.trim() === "") {
      errors.push(`Row ${rowNum}: Description is required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors.slice(0, 20), // Limit to first 20 errors
  };
}