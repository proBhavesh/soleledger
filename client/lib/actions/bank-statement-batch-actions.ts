"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { JournalEntryFactory } from "@/lib/accounting/journal-entry-factory";
import { checkTransactionLimit } from "@/lib/services/usage-tracking";
import { TransactionProcessor } from "@/lib/services/transaction-processor";
import { ACCOUNT_CODES, isAccountInRange } from "@/lib/constants/chart-of-accounts";
import type { 
  BatchImportTransaction, 
  ChartOfAccountsMap,
  ImportBankStatementResponse,
  ProcessingProgress
} from "@/lib/types/bank-imports";

/**
 * Get all Chart of Accounts for the business
 */
async function getChartOfAccountsMap(businessId: string): Promise<ChartOfAccountsMap> {
  const accounts = await db.category.findMany({
    where: { businessId, isActive: true },
    select: { id: true, accountCode: true, name: true },
  });

  const accountMap: ChartOfAccountsMap = {};
  
  for (const account of accounts) {
    switch (account.accountCode) {
      // Assets
      case ACCOUNT_CODES.CASH:
      case ACCOUNT_CODES.PETTY_CASH: accountMap.cash = account.id; break;
      case ACCOUNT_CODES.ACCOUNTS_RECEIVABLE: accountMap.accountsReceivable = account.id; break;
      case ACCOUNT_CODES.INVENTORY: accountMap.inventory = account.id; break;
      case ACCOUNT_CODES.PREPAID_EXPENSES: accountMap.prepaidExpenses = account.id; break;
      case ACCOUNT_CODES.FIXED_ASSETS: accountMap.officeEquipment = account.id; break;
      
      // Liabilities
      case ACCOUNT_CODES.ACCOUNTS_PAYABLE: accountMap.accountsPayable = account.id; break;
      case ACCOUNT_CODES.CREDIT_CARDS_PAYABLE: accountMap.creditCards = account.id; break;
      case ACCOUNT_CODES.SALES_TAX_PAYABLE: accountMap.salesTaxPayable = account.id; break;
      case ACCOUNT_CODES.PAYROLL_LIABILITIES: accountMap.payrollTaxPayable = account.id; break;
      case ACCOUNT_CODES.LOANS_PAYABLE: accountMap.loans = account.id; break;
      
      // Income
      case ACCOUNT_CODES.SALES_REVENUE: accountMap.salesRevenue = account.id; break;
      case ACCOUNT_CODES.OTHER_REVENUE: accountMap.otherIncome = account.id; break;
      
      // Expenses
      case ACCOUNT_CODES.COST_OF_GOODS_SOLD: accountMap.costOfGoodsSold = account.id; break;
      case ACCOUNT_CODES.SALARIES_WAGES: accountMap.salariesWages = account.id; break;
      case ACCOUNT_CODES.RENT_EXPENSE: accountMap.rent = account.id; break;
      case ACCOUNT_CODES.UTILITIES_EXPENSE: accountMap.utilities = account.id; break;
      case ACCOUNT_CODES.OFFICE_SUPPLIES: accountMap.officeSupplies = account.id; break;
      case ACCOUNT_CODES.ADVERTISING_MARKETING: accountMap.advertising = account.id; break;
      case ACCOUNT_CODES.TRAVEL_MEALS: accountMap.travel = account.id; break;
      case ACCOUNT_CODES.PROFESSIONAL_FEES: accountMap.professionalFees = account.id; break;
      case ACCOUNT_CODES.INSURANCE_EXPENSE: accountMap.insurance = account.id; break;
      case ACCOUNT_CODES.DEPRECIATION_EXPENSE: accountMap.depreciation = account.id; break;
      case ACCOUNT_CODES.MISCELLANEOUS_EXPENSE: accountMap.miscellaneous = account.id; break;
    }
  }
  
  // Ensure we have a fallback miscellaneous expense account
  if (!accountMap.miscellaneous && !accountMap.otherExpense) {
    // Find any expense account as fallback
    const fallbackExpense = accounts.find(a => 
      isAccountInRange(a.accountCode, "OPERATING_EXPENSES") ||
      isAccountInRange(a.accountCode, "COST_OF_SALES")
    );
    if (fallbackExpense) {
      accountMap.miscellaneous = fallbackExpense.id;
      // Using fallback expense account
    } else {
      // No miscellaneous expense account found
    }
  }
  
  return accountMap;
}

/**
 * Map suggested category name to Chart of Accounts category.
 * 
 * This function maps AI-suggested categories or imported transaction categories
 * to the business's Chart of Accounts. It uses a multi-step matching approach:
 * 1. Exact name match (case-insensitive)
 * 2. Account code match (if suggested category contains a code like "5030")
 * 3. Keyword-based fuzzy matching
 * 
 * @param businessId - The business ID to search categories for
 * @param suggestedCategory - The category name suggested by AI or from import
 * @param transactionType - Whether this is an income or expense transaction
 * @returns The category ID if found, undefined otherwise
 */
async function getCategoryId(
  businessId: string, 
  suggestedCategory: string | undefined,
  transactionType: "income" | "expense"
): Promise<string | undefined> {
  if (!suggestedCategory) return undefined;
  
  // First try exact match
  const exactMatch = await db.category.findFirst({
    where: {
      businessId,
      name: {
        equals: suggestedCategory,
        mode: 'insensitive'
      },
      isActive: true
    },
    select: { id: true }
  });
  
  if (exactMatch) return exactMatch.id;
  
  // Check if the suggested category contains an account code (e.g., "5030 - Rent")
  const accountCodeMatch = suggestedCategory.match(/^\d{4}/);
  if (accountCodeMatch) {
    const codeMatch = await db.category.findFirst({
      where: {
        businessId,
        accountCode: accountCodeMatch[0],
        isActive: true
      },
      select: { id: true }
    });
    
    if (codeMatch) return codeMatch.id;
  }
  
  // Try to match by keywords
  const keywords = suggestedCategory.toLowerCase().split(/\s+/);
  const categories = await db.category.findMany({
    where: {
      businessId,
      isActive: true,
      accountType: transactionType === "income" ? "INCOME" : "EXPENSE"
    },
    select: { id: true, name: true, description: true, accountCode: true }
  });
  
  // Score each category based on keyword matches
  let bestMatch = null;
  let bestScore = 0;
  
  for (const category of categories) {
    const categoryText = `${category.name} ${category.description || ''}`.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      if (categoryText.includes(keyword)) {
        score += keyword.length; // Longer keywords get higher scores
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }
  
  // Log for debugging category matching issues
  if (!bestMatch && suggestedCategory) {
    // No category match found for suggested category
  }
  
  return bestMatch?.id;
}

/**
 * @deprecated Use bulkImportBankTransactions from bank-import-actions.ts instead
 * This function is kept for backward compatibility but should not be used for new imports
 * 
 * Batch import bank statement transactions with robust processing
 */
export async function batchImportBankStatementTransactions(request: {
  documentId: string;
  bankAccountId: string;
  businessId: string;
  transactions: BatchImportTransaction[];
  progressCallback?: (progress: ProcessingProgress) => void;
}): Promise<ImportBankStatementResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  const { documentId, bankAccountId, businessId, transactions, progressCallback } = request;

  // Filter selected transactions
  const selectedTransactions = transactions.filter(tx => tx.selected !== false);
  
  if (selectedTransactions.length === 0) {
    return {
      success: false,
      error: "No transactions selected for import",
    };
  }

  // Check usage limits
  const usageCheck = await checkTransactionLimit(session.user.id, businessId, selectedTransactions.length);
  if (!usageCheck.allowed) {
    return {
      success: false,
      error: usageCheck.message || `Transaction limit exceeded. You can add ${usageCheck.remainingUsage} more transactions this month.`,
    };
  }

  try {
    // Verify business access
    const businessMember = await db.businessMember.findFirst({
      where: {
        businessId,
        userId: session.user.id,
      },
    });

    if (!businessMember) {
      // User does not have access to business
      return {
        success: false,
        error: "You don't have access to this business",
      };
    }

    // Log processing info only in development
    if (process.env.NODE_ENV === "development") {
      console.log(`Processing ${selectedTransactions.length} transactions for business ${businessId} by user ${session.user.id}`);
    }

    // Get chart of accounts mapping
    const accountMap = await getChartOfAccountsMap(businessId);
    
    // Ensure we have required accounts
    if (!accountMap.cash) {
      return {
        success: false,
        error: `Cash account (${ACCOUNT_CODES.CASH}) not found. Please ensure your Chart of Accounts is properly configured.`,
        data: {
          imported: 0,
          failed: selectedTransactions.length,
          skipped: 0,
          total: selectedTransactions.length,
        },
      };
    }

    // Check for at least one income account
    if (!accountMap.salesRevenue && !accountMap.serviceRevenue && !accountMap.otherIncome) {
      return {
        success: false,
        error: `At least one income account (${ACCOUNT_CODES.SALES_REVENUE} or ${ACCOUNT_CODES.OTHER_REVENUE}) is required. Please set up your Chart of Accounts first.`,
        data: {
          imported: 0,
          failed: selectedTransactions.length,
          skipped: 0,
          total: selectedTransactions.length,
        },
      };
    }

    // Create journal entry factory
    const journalFactory = new JournalEntryFactory({
      cashAccountId: accountMap.cash,
      accountsReceivableId: accountMap.accountsReceivable,
      inventoryId: accountMap.inventory,
      prepaidExpensesId: accountMap.prepaidExpenses,
      fixedAssetsId: accountMap.officeEquipment,
      accountsPayableId: accountMap.accountsPayable,
      creditCardsPayableId: accountMap.creditCards,
      salesTaxPayableId: accountMap.salesTaxPayable,
      payrollTaxPayableId: accountMap.payrollTaxPayable,
      loansPayableId: accountMap.loans,
      salesRevenueId: accountMap.salesRevenue,
      serviceRevenueId: accountMap.serviceRevenue,
      otherIncomeId: accountMap.otherIncome,
      costOfGoodsSoldId: accountMap.costOfGoodsSold,
      salariesWagesId: accountMap.salariesWages,
      rentExpenseId: accountMap.rent,
      utilitiesExpenseId: accountMap.utilities,
      interestExpenseId: accountMap.interestExpense,
      miscExpenseId: accountMap.miscellaneous || accountMap.otherExpense,
    });

    // Transform transactions to match processor format
    const processableTransactions: BatchImportTransaction[] = [];
    
    for (const tx of selectedTransactions) {
      // Map suggested category to actual category ID
      const categoryId = await getCategoryId(
        businessId, 
        tx.suggestedCategory,
        tx.type === "INCOME" ? "income" : "expense"
      );
      
      processableTransactions.push({
        ...tx,
        date: new Date(tx.date),
        type: tx.type,
        amount: Math.abs(tx.amount),
        bankAccountId,
        categoryId: categoryId || accountMap.miscellaneous || accountMap.otherExpense,
        vendor: tx.description,
        externalId: tx.reference,
        pending: false,
      });
    }

    // Create transaction processor with optimized configuration
    const processor = new TransactionProcessor({
      batchSize: 10, // Process 10 transactions at a time
      transactionTimeout: 30000, // 30 seconds per batch
      maxRetries: 3,
      progressCallback,
    });

    // Process transactions using the robust processor
    const result = await processor.processTransactions(processableTransactions, {
      businessId,
      userId: session.user.id,
      documentId,
      accountMap,
      journalFactory,
    });

    return {
      success: true,
      data: {
        imported: result.imported,
        failed: result.failed,
        skipped: result.skipped,
        total: selectedTransactions.length,
      },
    };
  } catch (error) {
    // Handle error gracefully without logging to console
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import transactions. Please try again.",
      data: {
        imported: 0,
        failed: selectedTransactions.length,
        skipped: 0,
        total: selectedTransactions.length,
      },
    };
  }
}