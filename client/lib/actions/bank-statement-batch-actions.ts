"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { JournalEntryFactory } from "@/lib/accounting/journal-entry-factory";
import { checkTransactionLimit, incrementTransactionCount } from "@/lib/services/usage-tracking";
import type { 
  BatchImportTransaction, 
  ChartOfAccountsMap,
  ImportBankStatementResponse,
  JournalEntryInput
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
    }
  }
  
  return accountMap;
}

/**
 * Map suggested category name to chart of accounts
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
  
  // Try to match by keywords
  const keywords = suggestedCategory.toLowerCase().split(/\s+/);
  const categories = await db.category.findMany({
    where: {
      businessId,
      isActive: true,
      accountType: transactionType === "income" ? "INCOME" : "EXPENSE"
    },
    select: { id: true, name: true, description: true }
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
  
  return bestMatch?.id;
}

/**
 * Batch import bank statement transactions with optimized performance
 */
export async function batchImportBankStatementTransactions(request: {
  documentId: string;
  bankAccountId: string;
  businessId: string;
  transactions: BatchImportTransaction[];
}): Promise<ImportBankStatementResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  const { documentId, bankAccountId, businessId, transactions } = request;

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
      return {
        success: false,
        error: "You don't have access to this business",
      };
    }

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
      miscExpenseId: accountMap.miscellaneous,
    });

    // Process transactions and create journal entries
    const transactionData: Prisma.TransactionCreateManyInput[] = [];
    const journalEntryBatches: Array<{
      transactionIndex: number;
      entries: JournalEntryInput[];
    }> = [];
    
    let skippedTransfers = 0;

    for (const [index, tx] of selectedTransactions.entries()) {
      // Map suggested category to actual category ID
      const categoryId = await getCategoryId(
        businessId, 
        tx.suggestedCategory,
        tx.type === "credit" ? "income" : "expense"
      );
      
      // Determine transaction type for database
      const transactionType = tx.type === "credit" ? "INCOME" : "EXPENSE";
      
      // Create journal entries using factory
      const journalEntrySet = journalFactory.createJournalEntries({
        ...tx,
        businessId,
        bankAccountId,
        categoryId,
      });
      
      // Skip if no journal entries (e.g., transfers)
      if (journalEntrySet.entries.length === 0) {
        skippedTransfers++;
        continue;
      }
      
      // Add transaction data
      transactionData.push({
        businessId,
        bankAccountId,
        description: tx.description,
        amount: tx.amount,
        date: new Date(tx.date),
        type: transactionType,
        categoryId: categoryId || accountMap.miscellaneous,
        reference: tx.reference,
        createdById: session.user.id,
        // Store extra data in notes for now since metadata field doesn't exist
        notes: `Source: Bank Statement Import${tx.balance ? ` | Balance: ${tx.balance}` : ''}`,
      });
      
      // Store journal entries for later
      journalEntryBatches.push({
        transactionIndex: index,
        entries: journalEntrySet.entries,
      });
    }

    // Perform batch operations in a transaction
    const result = await db.$transaction(async (prisma) => {
      // Create all transactions
      const createdTransactions = await prisma.transaction.createManyAndReturn({
        data: transactionData,
        select: { id: true },
      });
      
      // Create map of transaction indices to IDs
      const transactionIdMap = new Map<number, string>();
      createdTransactions.forEach((tx, idx) => {
        transactionIdMap.set(idx, tx.id);
      });
      
      // Prepare all journal entries with transaction IDs
      const allJournalEntries: Prisma.JournalEntryCreateManyInput[] = [];
      
      journalEntryBatches.forEach(({ transactionIndex, entries }) => {
        const transactionId = transactionIdMap.get(transactionIndex);
        if (transactionId) {
          entries.forEach(entry => {
            allJournalEntries.push({
              ...entry,
              transactionId,
            });
          });
        }
      });

      await prisma.journalEntry.createMany({
        data: allJournalEntries,
      });
      
      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: { 
          processingStatus: "COMPLETED",
          extractedData: {
            importedAt: new Date().toISOString(),
            importedTransactions: createdTransactions.length,
          },
        },
      });
      
      // Increment usage count
      await incrementTransactionCount(businessId, createdTransactions.length);
      
      return createdTransactions.length;
    });

    return {
      success: true,
      data: {
        imported: result,
        failed: 0,
        skipped: skippedTransfers,
        total: selectedTransactions.length,
      },
    };
  } catch (error) {
    console.error("Error in batch import:", error);
    return {
      success: false,
      error: "Failed to import transactions. Please try again.",
    };
  }
}