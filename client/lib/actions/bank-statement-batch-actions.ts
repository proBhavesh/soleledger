"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { JournalEntryFactory } from "@/lib/accounting/journal-entry-factory";
import { checkTransactionLimit } from "@/lib/services/usage-tracking";
import { TransactionProcessor } from "@/lib/services/transaction-processor";
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
      case "1000":
      case "1010": accountMap.cash = account.id; break;
      case "1100": accountMap.accountsReceivable = account.id; break;
      case "1200": accountMap.inventory = account.id; break;
      case "1300": 
      case "1310": 
      case "1320": accountMap.prepaidExpenses = account.id; break;
      case "1510": accountMap.officeEquipment = account.id; break;
      case "1530": accountMap.furniture = account.id; break;
      case "1540": accountMap.vehicles = account.id; break;
      
      // Liabilities
      case "2000": accountMap.accountsPayable = account.id; break;
      case "2110": accountMap.creditCards = account.id; break;
      case "2310": accountMap.salesTaxPayable = account.id; break;
      case "2320": accountMap.payrollTaxPayable = account.id; break;
      case "2400": accountMap.loans = account.id; break;
      
      // Income
      case "4010": accountMap.salesRevenue = account.id; break;
      case "4020": accountMap.serviceRevenue = account.id; break;
      case "4040": accountMap.interestIncome = account.id; break;
      case "4050": accountMap.otherIncome = account.id; break;
      
      // Expenses
      case "5010": accountMap.costOfGoodsSold = account.id; break;
      case "5020": accountMap.salariesWages = account.id; break;
      case "5030": accountMap.rent = account.id; break;
      case "5040": accountMap.utilities = account.id; break;
      case "5050": accountMap.officeSupplies = account.id; break;
      case "5070": accountMap.advertising = account.id; break;
      case "5080": accountMap.travel = account.id; break;
      case "5090": accountMap.meals = account.id; break;
      case "5110": accountMap.professionalFees = account.id; break;
      case "5120": accountMap.insurance = account.id; break;
      case "5130": accountMap.telephone = account.id; break;
      case "5140": accountMap.internet = account.id; break;
      case "5150": accountMap.software = account.id; break;
      case "5060": accountMap.fuel = account.id; break;
      case "5160": accountMap.vehicleMaintenance = account.id; break;
      case "5200": accountMap.interestExpense = account.id; break;
      case "5210": accountMap.bankCharges = account.id; break;
      case "5220": accountMap.creditCardFees = account.id; break;
      case "5250": accountMap.depreciation = account.id; break;
      case "5999": accountMap.miscellaneous = account.id; break;
      case "5900": accountMap.otherExpense = account.id; break;
    }
  }
  
  // Ensure we have a fallback miscellaneous expense account
  if (!accountMap.miscellaneous && !accountMap.otherExpense) {
    // Find any expense account as fallback
    const fallbackExpense = accounts.find(a => 
      parseInt(a.accountCode) >= 5000 && parseInt(a.accountCode) < 8000
    );
    if (fallbackExpense) {
      accountMap.miscellaneous = fallbackExpense.id;
      console.warn(`Using ${fallbackExpense.name} (${fallbackExpense.accountCode}) as fallback expense account`);
    } else {
      console.warn("No miscellaneous expense account found - some expense entries may fail");
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
    console.log(`No category match found for "${suggestedCategory}" (${transactionType})`);
  }
  
  return bestMatch?.id;
}

/**
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
      console.error(`User ${session.user.id} does not have access to business ${businessId}`);
      return {
        success: false,
        error: "You don't have access to this business",
      };
    }

    console.log(`Processing ${selectedTransactions.length} transactions for business ${businessId} by user ${session.user.id}`);

    // Get chart of accounts mapping
    const accountMap = await getChartOfAccountsMap(businessId);
    
    // Ensure we have required accounts
    if (!accountMap.cash) {
      return {
        success: false,
        error: "Cash account not found. Please ensure your Chart of Accounts is properly configured.",
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
    console.error("Error in batch import:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import transactions. Please try again.",
    };
  }
}