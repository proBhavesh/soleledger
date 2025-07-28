"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "./business-context-actions";
import { checkTransactionLimit } from "@/lib/services/usage-tracking";
import { TransactionProcessor } from "@/lib/services/transaction-processor";
import type { JournalEntryAccountIds } from "@/lib/types/bank-imports";
import { ACCOUNT_CODES, ACCOUNT_RANGES, isAccountInRange } from "@/lib/constants/chart-of-accounts";
import { hasChartOfAccounts } from "./chart-of-accounts-actions";

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
  let importDocument: { id: string } | null = null;
  
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
    
    // Check if business has Chart of Accounts set up
    const hasAccounts = await hasChartOfAccounts(businessId);
    if (!hasAccounts) {
      return {
        success: false,
        totalCount: request.transactions.length,
        successCount: 0,
        failedCount: request.transactions.length,
        errors: [{ row: 0, error: "Chart of Accounts not set up. Please set up your Chart of Accounts first." }],
      };
    }

    // Verify bank account belongs to business and get its Chart of Accounts
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        id: request.bankAccountId,
        businessId,
      },
      include: {
        chartOfAccounts: true,
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
      // Map expense accounts following accountant's structure
      if (account.accountCode === ACCOUNT_CODES.MISCELLANEOUS_EXPENSE) {
        accountMap.miscellaneous = account.id;
        journalAccountIds.miscExpenseId = account.id;
      }
      if (account.accountCode === ACCOUNT_CODES.COST_OF_GOODS_SOLD) {
        accountMap.costOfGoodsSold = account.id;
        journalAccountIds.costOfGoodsSoldId = account.id;
      }
      if (account.accountCode === ACCOUNT_CODES.SALARIES_WAGES) {
        accountMap.salariesWages = account.id;
        journalAccountIds.salariesWagesId = account.id;
      }
      if (account.accountCode === ACCOUNT_CODES.RENT_EXPENSE) {
        accountMap.rent = account.id;
        journalAccountIds.rentExpenseId = account.id;
      }
      if (account.accountCode === ACCOUNT_CODES.UTILITIES_EXPENSE) {
        accountMap.utilities = account.id;
        journalAccountIds.utilitiesExpenseId = account.id;
      }
      // Map income accounts
      if (account.accountCode === ACCOUNT_CODES.SALES_REVENUE) {
        accountMap.salesRevenue = account.id;
        journalAccountIds.salesRevenueId = account.id;
      }
      if (account.accountCode === ACCOUNT_CODES.OTHER_REVENUE) {
        accountMap.otherIncome = account.id;
        journalAccountIds.otherIncomeId = account.id;
      }
      // Map asset accounts - only use generic cash as fallback
      if (!journalAccountIds.cashAccountId && account.accountCode === ACCOUNT_CODES.CASH) {
        journalAccountIds.cashAccountId = account.id;
      }
    });
    
    // Use the bank account's specific Chart of Accounts entry if available
    if (bankAccount.chartOfAccounts) {
      journalAccountIds.cashAccountId = bankAccount.chartOfAccounts.id;
    }
    
    // If no miscellaneous expense account, use any expense account as fallback
    if (!journalAccountIds.miscExpenseId) {
      const anyExpenseAccount = accounts.find(a => 
        a.accountType === "EXPENSE" && 
        isAccountInRange(a.accountCode, "OPERATING_EXPENSES")
      );
      if (anyExpenseAccount) {
        accountMap.miscellaneous = anyExpenseAccount.id;
        journalAccountIds.miscExpenseId = anyExpenseAccount.id;
      }
    }

    // Create a dummy document for tracking
    importDocument = await db.document.create({
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

    // Check if we have minimum required accounts
    if (!journalAccountIds.cashAccountId) {
      // Update document status to failed
      await db.document.update({
        where: { id: importDocument.id },
        data: {
          processingStatus: "FAILED",
          processingError: "Cash account (1000) is required but not found in Chart of Accounts",
        },
      });
      
      return {
        success: false,
        totalCount: request.transactions.length,
        successCount: 0,
        failedCount: request.transactions.length,
        errors: [{
          row: 0,
          error: `Cash account (${ACCOUNT_CODES.CASH}) is required but not found in Chart of Accounts. Please set up your Chart of Accounts first.`,
        }],
      };
    }

    if (!journalAccountIds.salesRevenueId && !journalAccountIds.otherIncomeId) {
      // Update document status to failed
      await db.document.update({
        where: { id: importDocument.id },
        data: {
          processingStatus: "FAILED",
          processingError: "At least one income account is required",
        },
      });
      
      return {
        success: false,
        totalCount: request.transactions.length,
        successCount: 0,
        failedCount: request.transactions.length,
        errors: [{
          row: 0,
          error: `At least one income account (${ACCOUNT_CODES.SALES_REVENUE} or ${ACCOUNT_CODES.OTHER_REVENUE}) is required but not found in Chart of Accounts. Please set up your Chart of Accounts first.`,
        }],
      };
    }

    // Check for at least one expense account
    if (!journalAccountIds.miscExpenseId && !journalAccountIds.costOfGoodsSoldId && 
        !journalAccountIds.salariesWagesId && !journalAccountIds.rentExpenseId && 
        !journalAccountIds.utilitiesExpenseId) {
      // Update document status to failed
      await db.document.update({
        where: { id: importDocument.id },
        data: {
          processingStatus: "FAILED",
          processingError: "At least one expense account is required",
        },
      });
      
      return {
        success: false,
        totalCount: request.transactions.length,
        successCount: 0,
        failedCount: request.transactions.length,
        errors: [{
          row: 0,
          error: `At least one expense account (${ACCOUNT_CODES.COST_OF_GOODS_SOLD} or ${ACCOUNT_RANGES.OPERATING_EXPENSES.min}-${ACCOUNT_RANGES.OPERATING_EXPENSES.max}) is required but not found in Chart of Accounts. Please set up your Chart of Accounts first.`,
        }],
      };
    }

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

    // Map common category names to account codes
    const categoryToAccountMap: Record<string, string | undefined> = {
      // Bank and financial
      "bank charges": accountMap.miscellaneous,
      "bank service fee": accountMap.miscellaneous,
      "nsf fee": accountMap.miscellaneous,
      "credit card fees": accountMap.miscellaneous,
      "interest expense": accountMap.miscellaneous,
      
      // Software and subscriptions
      "software": accountMap.miscellaneous,
      "software subscription": accountMap.miscellaneous,
      "zoom subscription": accountMap.miscellaneous,
      
      // Income
      "income": accountMap.otherIncome || accountMap.salesRevenue,
      "sales": accountMap.salesRevenue || accountMap.otherIncome,
      "service revenue": accountMap.serviceRevenue || accountMap.otherIncome,
      "transfer": accountMap.otherIncome || accountMap.salesRevenue,
      
      // Payroll
      "salary": accountMap.salariesWages || accountMap.miscellaneous,
      "payroll": accountMap.salariesWages || accountMap.miscellaneous,
      "salaries & wages": accountMap.salariesWages || accountMap.miscellaneous,
      "employee benefits": accountMap.miscellaneous,
      
      // Operating expenses
      "rent": accountMap.rent || accountMap.miscellaneous,
      "utilities": accountMap.utilities || accountMap.miscellaneous,
      "office supplies": accountMap.miscellaneous,
      "meals & entertainment": accountMap.miscellaneous,
      "travel": accountMap.miscellaneous,
      "advertising": accountMap.miscellaneous,
      "insurance": accountMap.miscellaneous,
      "professional fees": accountMap.miscellaneous,
      "taxes": accountMap.miscellaneous,
      "telephone": accountMap.miscellaneous,
      "internet": accountMap.miscellaneous,
      "fuel": accountMap.miscellaneous,
      "shipping": accountMap.miscellaneous,
      "repairs & maintenance": accountMap.miscellaneous,
      "cost of goods sold": accountMap.costOfGoodsSold || accountMap.miscellaneous,
      "equipment rental": accountMap.miscellaneous,
      "loan payments": accountMap.miscellaneous,
    };

    // Convert transactions to the format expected by the processor
    const transactionsToProcess = request.transactions.map((txn, index) => {
      // Try to map the category from CSV to a proper account
      let categoryId: string | undefined = undefined;
      if (txn.category) {
        const lowerCategory = txn.category.toLowerCase();
        categoryId = categoryToAccountMap[lowerCategory];
        
        // If no direct mapping, try to find partial matches
        if (!categoryId) {
          for (const [key, value] of Object.entries(categoryToAccountMap)) {
            if (lowerCategory.includes(key) || key.includes(lowerCategory)) {
              categoryId = value;
              break;
            }
          }
        }
      }
      
      return {
        date: new Date(txn.date),
        description: txn.description,
        amount: txn.amount,
        type: txn.amount >= 0 ? "INCOME" as const : "EXPENSE" as const,
        bankAccountId: request.bankAccountId,
        reference: txn.reference,
        businessId,
        categoryId,
        rowIndex: index + 2, // +2 for header row and 1-based indexing
      };
    });

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

    // Update document status based on results
    await db.document.update({
      where: { id: importDocument.id },
      data: {
        processingStatus: failedCount === 0 ? "COMPLETED" : (successCount === 0 ? "FAILED" : "COMPLETED"),
        extractedData: {
          importedAt: new Date().toISOString(),
          importedTransactions: successCount,
          failedTransactions: failedCount,
          errors: errors.slice(0, 50),
        },
        processingError: failedCount > 0 ? `${failedCount} transactions failed to import` : null,
      },
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
    
    // Update document status to failed if it was created
    if (importDocument?.id) {
      await db.document.update({
        where: { id: importDocument.id },
        data: {
          processingStatus: "FAILED",
          processingError: error instanceof Error ? error.message : "Import failed",
        },
      }).catch(console.error);
    }
    
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