"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { saveGeneratedReport } from "./report-persistence-actions";
import { buildUserBusinessWhere } from "@/lib/utils/permission-helpers";
import {
  reportRequestSchema,
  type ReportRequest,
  type ReconciliationBreakdown,
  type CategoryWithReconciliation,
  type ProfitLossData,
  type ExpenseCategoriesData,
  type ReconciliationSummaryReport,
  type BalanceSheetData,
  type CashFlowItem,
  type CashFlowData,
} from "@/lib/types/reports";

/**
 * Generate Profit & Loss Report with Reconciliation Status
 */
export async function generateProfitLossReport(
  data: ReportRequest,
  saveReport: boolean = false
): Promise<{ success: boolean; data?: ProfitLossData; reportId?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = reportRequestSchema.parse(data);

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Get transactions for the period with reconciliation status
    const transactions = await db.transaction.findMany({
      where: {
        businessId: business.id,
        date: {
          gte: validatedData.startDate,
          lte: validatedData.endDate,
        },
      },
      include: {
        category: true,
        reconciliation: true,
      },
    });

    // Separate income and expense transactions
    const incomeTransactions = transactions.filter((t) => t.type === "INCOME");
    const expenseTransactions = transactions.filter(
      (t) => t.type === "EXPENSE"
    );

    // Calculate totals
    const totalIncome = incomeTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const totalExpenses = expenseTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const netIncome = totalIncome - totalExpenses;

    // Group by category with reconciliation breakdown
    const incomeByCategory = groupByCategoryWithReconciliation(
      incomeTransactions,
      totalIncome
    );
    const expensesByCategory = groupByCategoryWithReconciliation(
      expenseTransactions,
      totalExpenses
    );

    // Calculate overall reconciliation summaries
    const incomeReconciliation =
      calculateReconciliationBreakdown(incomeTransactions);
    const expenseReconciliation =
      calculateReconciliationBreakdown(expenseTransactions);
    const overallReconciliation =
      calculateReconciliationBreakdown(transactions);

    const period = `${validatedData.startDate.toLocaleDateString()} - ${validatedData.endDate.toLocaleDateString()}`;

    const reportData: ProfitLossData = {
      period,
      totalIncome,
      totalExpenses,
      netIncome,
      incomeByCategory,
      expensesByCategory,
      incomeReconciliation,
      expenseReconciliation,
      overallReconciliation,
    };

    // Save report if requested
    let reportId: string | undefined;
    if (saveReport) {
      const saveResult = await saveGeneratedReport({
        type: "PROFIT_LOSS",
        title: `Profit & Loss Report - ${period}`,
        data: reportData,
        parameters: {
          type: data.type,
          startDate: data.startDate,
          endDate: data.endDate,
          period: data.period,
        },
        period: data.period || "custom",
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
      });

      if (saveResult.success) {
        reportId = saveResult.reportId;
      }
    }

    return { success: true, data: reportData, reportId };
  } catch (error) {
    console.error("Error generating P&L report:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid request data" };
    }
    return { success: false, error: "Failed to generate report" };
  }
}

/**
 * Generate Expense Categories Report with Reconciliation Status
 */
export async function generateExpenseCategoriesReport(
  data: ReportRequest,
  saveReport: boolean = false
): Promise<{ success: boolean; data?: ExpenseCategoriesData; reportId?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = reportRequestSchema.parse(data);

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Get expense transactions for the period with reconciliation status
    const transactions = await db.transaction.findMany({
      where: {
        businessId: business.id,
        type: "EXPENSE",
        date: {
          gte: validatedData.startDate,
          lte: validatedData.endDate,
        },
      },
      include: {
        category: true,
        reconciliation: true,
      },
    });

    const totalExpenses = transactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );

    // Group by category with reconciliation stats
    const categoryMap = new Map<
      string,
      {
        amount: number;
        count: number;
        transactions: typeof transactions;
      }
    >();

    transactions.forEach((transaction) => {
      const categoryName = transaction.category?.name || "Uncategorized";
      const existing = categoryMap.get(categoryName) || {
        amount: 0,
        count: 0,
        transactions: [],
      };
      existing.amount += Math.abs(transaction.amount);
      existing.count += 1;
      existing.transactions.push(transaction);
      categoryMap.set(categoryName, existing);
    });

    const categories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        transactionCount: data.count,
        reconciliation: calculateReconciliationBreakdown(data.transactions),
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate overall reconciliation breakdown
    const overallReconciliation =
      calculateReconciliationBreakdown(transactions);

    const period = `${validatedData.startDate.toLocaleDateString()} - ${validatedData.endDate.toLocaleDateString()}`;

    const reportData: ExpenseCategoriesData = {
      period,
      totalExpenses,
      categories,
      overallReconciliation,
    };

    // Save report if requested
    let reportId: string | undefined;
    if (saveReport) {
      const saveResult = await saveGeneratedReport({
        type: "EXPENSE_CATEGORIES",
        title: `Expense Categories Report - ${period}`,
        data: reportData,
        parameters: {
          type: data.type,
          startDate: data.startDate,
          endDate: data.endDate,
          period: data.period,
        },
        period: data.period || "custom",
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
      });

      if (saveResult.success) {
        reportId = saveResult.reportId;
      }
    }

    return { success: true, data: reportData, reportId };
  } catch (error) {
    console.error("Error generating expense categories report:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid request data" };
    }
    return { success: false, error: "Failed to generate report" };
  }
}

/**
 * Generate Reconciliation Summary Report
 */
export async function generateReconciliationSummaryReport(
  data: ReportRequest,
  saveReport: boolean = false
): Promise<{
  success: boolean;
  data?: ReconciliationSummaryReport;
  reportId?: string;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = reportRequestSchema.parse(data);

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Get all transactions for the period with full details
    const transactions = await db.transaction.findMany({
      where: {
        businessId: business.id,
        date: {
          gte: validatedData.startDate,
          lte: validatedData.endDate,
        },
      },
      include: {
        category: true,
        reconciliation: true,
        bankAccount: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    // Calculate overall reconciliation breakdown
    const overallSummary = calculateReconciliationBreakdown(transactions);

    // Get unmatched transactions
    const unmatchedTransactions = transactions
      .filter(
        (t) => !t.reconciliation || t.reconciliation.status === "UNMATCHED"
      )
      .map((t) => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        description: t.description,
        category: t.category?.name || null,
        type: t.type as "INCOME" | "EXPENSE",
        bankAccount: t.bankAccount?.name || null,
      }));

    // Get pending review transactions
    const pendingReviewTransactions = transactions
      .filter((t) => t.reconciliation?.status === "PENDING_REVIEW")
      .map((t) => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        description: t.description,
        category: t.category?.name || null,
        type: t.type as "INCOME" | "EXPENSE",
        bankAccount: t.bankAccount?.name || null,
        confidence: t.reconciliation?.confidence || null,
      }));

    // Group compliance by category and type
    const categoryTypeMap = new Map<string, typeof transactions>();

    transactions.forEach((transaction) => {
      const key = `${transaction.category?.name || "Uncategorized"}_${
        transaction.type
      }`;
      const existing = categoryTypeMap.get(key) || [];
      existing.push(transaction);
      categoryTypeMap.set(key, existing);
    });

    const complianceByCategory = Array.from(categoryTypeMap.entries())
      .map(([key, categoryTransactions]) => {
        const [category, type] = key.split("_");
        return {
          category,
          type: type as "INCOME" | "EXPENSE",
          reconciliation:
            calculateReconciliationBreakdown(categoryTransactions),
        };
      })
      .filter((item) => item.reconciliation.totalAmount > 0)
      .sort(
        (a, b) => b.reconciliation.totalAmount - a.reconciliation.totalAmount
      );

    // Calculate risk assessment
    const riskAssessment = calculateRiskAssessment(overallSummary);

    const period = `${validatedData.startDate.toLocaleDateString()} - ${validatedData.endDate.toLocaleDateString()}`;

    const reportData: ReconciliationSummaryReport = {
      period,
      overallSummary,
      unmatchedTransactions,
      pendingReviewTransactions,
      complianceByCategory,
      riskAssessment,
    };

    // Save report if requested
    let reportId: string | undefined;
    if (saveReport) {
      const saveResult = await saveGeneratedReport({
        type: "RECONCILIATION_SUMMARY",
        title: `Reconciliation Summary - ${period}`,
        data: reportData,
        parameters: {
          type: data.type,
          startDate: data.startDate,
          endDate: data.endDate,
          period: data.period,
        },
        period: data.period || "custom",
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
      });

      if (saveResult.success) {
        reportId = saveResult.reportId;
      }
    }

    return { success: true, data: reportData, reportId };
  } catch (error) {
    console.error("Error generating reconciliation summary report:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid request data" };
    }
    return {
      success: false,
      error: "Failed to generate reconciliation report",
    };
  }
}

function calculateRiskAssessment(reconciliation: ReconciliationBreakdown) {
  const { matchedPercentage, unmatchedAmount, totalAmount } = reconciliation;

  // High risk: Large unmatched amounts or low match percentage
  const highRiskAmount = matchedPercentage < 50 ? unmatchedAmount : 0;

  // Medium risk: Moderate unmatched amounts
  const mediumRiskAmount =
    matchedPercentage >= 50 && matchedPercentage < 80 ? unmatchedAmount : 0;

  // Low risk: Small unmatched amounts or high match percentage
  const lowRiskAmount = matchedPercentage >= 80 ? unmatchedAmount : 0;

  // Determine overall risk level
  let riskLevel: "LOW" | "MEDIUM" | "HIGH";
  if (matchedPercentage >= 90) {
    riskLevel = "LOW";
  } else if (matchedPercentage >= 70) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "HIGH";
  }

  // Adjust risk level based on absolute amounts
  if (unmatchedAmount > totalAmount * 0.3) {
    riskLevel = "HIGH";
  } else if (unmatchedAmount > totalAmount * 0.1 && riskLevel === "LOW") {
    riskLevel = "MEDIUM";
  }

  return {
    highRiskAmount,
    mediumRiskAmount,
    lowRiskAmount,
    riskLevel,
  };
}

// Helper functions
function groupByCategoryWithReconciliation(
  transactions: Array<{
    category?: { name: string } | null;
    amount: number;
    reconciliation?: {
      status: string;
    } | null;
  }>,
  totalAmount: number
): CategoryWithReconciliation[] {
  const categoryMap = new Map<string, typeof transactions>();

  transactions.forEach((transaction) => {
    const categoryName = transaction.category?.name || "Uncategorized";
    const existing = categoryMap.get(categoryName) || [];
    existing.push(transaction);
    categoryMap.set(categoryName, existing);
  });

  return Array.from(categoryMap.entries())
    .map(([category, categoryTransactions]) => {
      const amount = categoryTransactions.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
      );
      const reconciliation =
        calculateReconciliationBreakdown(categoryTransactions);

      return {
        category,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        reconciliation,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

function calculateReconciliationBreakdown(
  transactions: Array<{
    amount: number;
    reconciliation?: {
      status: string;
    } | null;
  }>
): ReconciliationBreakdown {
  const totalAmount = transactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  const matchedTransactions = transactions.filter(
    (t) =>
      t.reconciliation?.status === "MATCHED" ||
      t.reconciliation?.status === "MANUALLY_MATCHED"
  );

  const unmatchedTransactions = transactions.filter(
    (t) => !t.reconciliation || t.reconciliation.status === "UNMATCHED"
  );

  const pendingReviewTransactions = transactions.filter(
    (t) => t.reconciliation?.status === "PENDING_REVIEW"
  );

  const matchedAmount = matchedTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  const unmatchedAmount = unmatchedTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  const pendingReviewAmount = pendingReviewTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  const matchedPercentage =
    totalAmount > 0 ? (matchedAmount / totalAmount) * 100 : 0;

  return {
    totalAmount,
    matchedAmount,
    unmatchedAmount,
    pendingReviewAmount,
    matchedPercentage,
    matchedCount: matchedTransactions.length,
    unmatchedCount: unmatchedTransactions.length,
    pendingReviewCount: pendingReviewTransactions.length,
  };
}

/**
 * Generate Balance Sheet Report using journal entries (double-entry bookkeeping)
 */
export async function generateBalanceSheetReport(
  data: ReportRequest,
  saveReport: boolean = false
): Promise<{ success: boolean; data?: BalanceSheetData; reportId?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = reportRequestSchema.parse(data);

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Get all Chart of Accounts categories with their journal entries
    const allCategories = await db.category.findMany({
      where: {
        businessId: business.id,
        isActive: true,
      },
      include: {
        journalEntries: {
          where: {
            transaction: {
              date: {
                lte: validatedData.endDate,
              },
            },
          },
          include: {
            transaction: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { accountCode: "asc" }],
    });

    // Get all bank accounts with their current balances
    const bankAccounts = await db.bankAccount.findMany({
      where: {
        businessId: business.id,
      },
      select: {
        id: true,
        name: true,
        accountType: true,
        balance: true,
        isManual: true,
        institution: true,
      },
    });

    // Calculate balances for each account using journal entries
    const accountBalances = new Map<string, {
      category: typeof allCategories[0];
      balance: number;
    }>();

    for (const category of allCategories) {
      let balance = 0;

      // Calculate balance based on account type and journal entries
      for (const entry of category.journalEntries) {
        const debitAmount = entry.debitAmount || 0;
        const creditAmount = entry.creditAmount || 0;

        switch (category.accountType) {
          case "ASSET":
          case "EXPENSE":
            // For assets and expenses: debits increase, credits decrease
            balance += debitAmount - creditAmount;
            break;
          case "LIABILITY":
          case "EQUITY":
          case "INCOME":
            // For liabilities, equity, and income: credits increase, debits decrease
            balance += creditAmount - debitAmount;
            break;
        }
      }

      if (balance !== 0) {
        accountBalances.set(category.id, { category, balance });
      }
    }

    // Group accounts by type
    const assetAccounts = allCategories.filter(c => c.accountType === "ASSET");
    const liabilityAccounts = allCategories.filter(c => c.accountType === "LIABILITY");
    const equityAccounts = allCategories.filter(c => c.accountType === "EQUITY");
    const incomeAccounts = allCategories.filter(c => c.accountType === "INCOME");
    const expenseAccounts = allCategories.filter(c => c.accountType === "EXPENSE");

    // Calculate totals for each section
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalIncome = 0;
    let totalExpenses = 0;

    // Create line item groups according to client's financial statement structure
    const lineItemGroups = {
      // Current Assets
      cashAndBank: { name: "Cash and Bank", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
      accountsReceivable: { name: "Accounts Receivable", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
      inventory: { name: "Inventory", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
      prepaidExpenses: { name: "Prepaid Expenses", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
      // Non-Current Assets
      fixedAssets: { name: "Fixed Assets", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
      otherAssets: { name: "Other Assets", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
    };

    // First, add bank accounts to Cash and Bank line item
    for (const bankAccount of bankAccounts) {
      if (bankAccount.accountType === "CHECKING" || bankAccount.accountType === "SAVINGS") {
        const amount = bankAccount.balance;
        if (amount !== 0) {
          lineItemGroups.cashAndBank.accounts.push({
            name: `${bankAccount.name} (${bankAccount.institution || 'Bank Account'})`,
            accountCode: "1000", // Map to Cash GL code
            amount: amount,
          });
          lineItemGroups.cashAndBank.total += amount;
          totalAssets += amount;
        }
      }
    }

    // Then, add Chart of Accounts asset accounts to appropriate line items
    for (const account of assetAccounts) {
      const accountData = accountBalances.get(account.id);
      if (accountData && accountData.balance !== 0) {
        const item = {
          name: account.name,
          accountCode: account.accountCode,
          amount: Math.abs(accountData.balance),
        };

        // Group accounts by GL code ranges according to client's CSV
        const code = parseInt(account.accountCode);
        if (code >= 1000 && code < 1100) {
          // Cash accounts (1000-1099)
          lineItemGroups.cashAndBank.accounts.push(item);
          lineItemGroups.cashAndBank.total += accountData.balance;
        } else if (code >= 1100 && code < 1200) {
          // Accounts Receivable (1100-1199)
          lineItemGroups.accountsReceivable.accounts.push(item);
          lineItemGroups.accountsReceivable.total += accountData.balance;
        } else if (code >= 1200 && code < 1300) {
          // Inventory (1200-1299)
          lineItemGroups.inventory.accounts.push(item);
          lineItemGroups.inventory.total += accountData.balance;
        } else if (code >= 1300 && code < 1400) {
          // Prepaid Expenses (1300-1399)
          lineItemGroups.prepaidExpenses.accounts.push(item);
          lineItemGroups.prepaidExpenses.total += accountData.balance;
        } else if (code >= 1400 && code < 1500) {
          // Fixed Assets (1400-1499)
          lineItemGroups.fixedAssets.accounts.push(item);
          lineItemGroups.fixedAssets.total += accountData.balance;
        } else if (code >= 1500) {
          // Other Assets (1500+)
          lineItemGroups.otherAssets.accounts.push(item);
          lineItemGroups.otherAssets.total += accountData.balance;
        }
        
        totalAssets += accountData.balance;
      }
    }

    // Build assets structure with line items
    const assets = {
      current: [] as Array<{ name: string; accounts: Array<{ name: string; accountCode: string; amount: number }>; total: number }>,
      nonCurrent: [] as Array<{ name: string; accounts: Array<{ name: string; accountCode: string; amount: number }>; total: number }>,
      total: totalAssets,
    };

    // Add current asset line items
    if (lineItemGroups.cashAndBank.total !== 0) {
      assets.current.push(lineItemGroups.cashAndBank);
    }
    if (lineItemGroups.accountsReceivable.total !== 0) {
      assets.current.push(lineItemGroups.accountsReceivable);
    }
    if (lineItemGroups.inventory.total !== 0) {
      assets.current.push(lineItemGroups.inventory);
    }
    if (lineItemGroups.prepaidExpenses.total !== 0) {
      assets.current.push(lineItemGroups.prepaidExpenses);
    }

    // Add non-current asset line items
    if (lineItemGroups.fixedAssets.total !== 0) {
      assets.nonCurrent.push(lineItemGroups.fixedAssets);
    }
    if (lineItemGroups.otherAssets.total !== 0) {
      assets.nonCurrent.push(lineItemGroups.otherAssets);
    }

    // Create liability line item groups
    const liabilityLineItems = {
      // Current Liabilities
      accountsPayable: { name: "Accounts Payable", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
      creditCardsPayable: { name: "Credit Cards Payable", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
      loans: { name: "Loans", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
      otherLiabilities: { name: "Other liabilities", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
    };

    // First, add bank liability accounts
    for (const bankAccount of bankAccounts) {
      // For liability accounts, negative balance means we owe money
      // Display as positive on the Balance Sheet
      const amount = -bankAccount.balance;
      
      if (bankAccount.accountType === "CREDIT_CARD" && amount > 0) {
        liabilityLineItems.creditCardsPayable.accounts.push({
          name: `${bankAccount.name} (${bankAccount.institution || 'Credit Card'})`,
          accountCode: "2100", // Credit cards payable
          amount: amount,
        });
        liabilityLineItems.creditCardsPayable.total += amount;
        totalLiabilities += amount;
      } else if ((bankAccount.accountType === "LINE_OF_CREDIT" || bankAccount.accountType === "LOAN") && amount > 0) {
        liabilityLineItems.loans.accounts.push({
          name: `${bankAccount.name} (${bankAccount.institution || 'Loan'})`,
          accountCode: "2400", // Loans payable
          amount: amount,
        });
        liabilityLineItems.loans.total += amount;
        totalLiabilities += amount;
      }
    }

    // Then, add Chart of Accounts liability accounts
    for (const account of liabilityAccounts) {
      const accountData = accountBalances.get(account.id);
      if (accountData && accountData.balance !== 0) {
        const item = {
          name: account.name,
          accountCode: account.accountCode,
          amount: Math.abs(accountData.balance),
        };

        // Group accounts by GL code ranges according to client's CSV
        const code = parseInt(account.accountCode);
        if (code >= 2000 && code < 2100) {
          // Accounts Payable (2000-2099)
          liabilityLineItems.accountsPayable.accounts.push(item);
          liabilityLineItems.accountsPayable.total += accountData.balance;
        } else if (code >= 2100 && code < 2200) {
          // Credit Cards Payable (2100-2199)
          liabilityLineItems.creditCardsPayable.accounts.push(item);
          liabilityLineItems.creditCardsPayable.total += accountData.balance;
        } else if (code >= 2400 && code < 2600) {
          // Loans (2400-2599)
          liabilityLineItems.loans.accounts.push(item);
          liabilityLineItems.loans.total += accountData.balance;
        } else {
          // Other liabilities (2200-2399, 2600+)
          liabilityLineItems.otherLiabilities.accounts.push(item);
          liabilityLineItems.otherLiabilities.total += accountData.balance;
        }
        
        totalLiabilities += accountData.balance;
      }
    }

    // Build liabilities structure with line items
    const liabilities = {
      current: [] as Array<{ name: string; accounts: Array<{ name: string; accountCode: string; amount: number }>; total: number }>,
      nonCurrent: [] as Array<{ name: string; accounts: Array<{ name: string; accountCode: string; amount: number }>; total: number }>,
      total: totalLiabilities,
    };

    // Add liability line items (all as current for now, based on client's CSV)
    if (liabilityLineItems.accountsPayable.total !== 0) {
      liabilities.current.push(liabilityLineItems.accountsPayable);
    }
    if (liabilityLineItems.creditCardsPayable.total !== 0) {
      liabilities.current.push(liabilityLineItems.creditCardsPayable);
    }
    if (liabilityLineItems.loans.total !== 0) {
      liabilities.current.push(liabilityLineItems.loans);
    }
    if (liabilityLineItems.otherLiabilities.total !== 0) {
      liabilities.current.push(liabilityLineItems.otherLiabilities);
    }

    // Calculate net income (Income - Expenses)
    for (const account of incomeAccounts) {
      const accountData = accountBalances.get(account.id);
      if (accountData) {
        totalIncome += accountData.balance;
      }
    }

    for (const account of expenseAccounts) {
      const accountData = accountBalances.get(account.id);
      if (accountData) {
        totalExpenses += accountData.balance;
      }
    }

    const netIncome = totalIncome - totalExpenses;

    // Create equity line item group
    const equityLineItems = {
      equity: { name: "Equity", accounts: [] as Array<{ name: string; accountCode: string; amount: number }>, total: 0 },
    };

    // Process equity accounts
    let hasRetainedEarningsAccount = false;

    for (const account of equityAccounts) {
      const accountData = accountBalances.get(account.id);
      
      // Check if this is retained earnings account
      if (account.accountCode === "3100" || account.name.toLowerCase().includes("retained earnings")) {
        hasRetainedEarningsAccount = true;
      }
      
      if (accountData && accountData.balance !== 0) {
        equityLineItems.equity.accounts.push({
          name: account.name,
          accountCode: account.accountCode,
          amount: accountData.balance,
        });
        equityLineItems.equity.total += accountData.balance;
        totalEquity += accountData.balance;
      }
    }

    // Always show retained earnings, even if zero
    if (!hasRetainedEarningsAccount) {
      equityLineItems.equity.accounts.push({
        name: "Retained Earnings",
        accountCode: "3100",
        amount: 0,
      });
    }

    // Add current year earnings as a separate account
    equityLineItems.equity.accounts.push({
      name: "Current Year Earnings",
      accountCode: "3200",
      amount: netIncome,
    });
    equityLineItems.equity.total += netIncome;

    // Add current year earnings to total equity
    totalEquity += netIncome;

    // Build equity structure
    const equity = {
      items: [] as Array<{ name: string; accounts: Array<{ name: string; accountCode: string; amount: number }>; total: number }>,
      total: totalEquity,
    };

    if (equityLineItems.equity.accounts.length > 0) {
      equity.items.push(equityLineItems.equity);
    }

    // Check if balance sheet balances
    const difference = totalAssets - (totalLiabilities + totalEquity);
    const isBalanced = Math.abs(difference) < 0.01; // Allow for small rounding differences

    // Convert to proper BalanceSheetData format with line items
    const balanceSheetData: BalanceSheetData = {
      period: `As of ${validatedData.endDate.toLocaleDateString()}`,
      asOfDate: validatedData.endDate.toISOString(),
      assets: {
        currentAssets: assets.current.map(lineItem => ({
          name: lineItem.name,
          amount: lineItem.total,
          reconciliation: {
            totalAmount: lineItem.total,
            matchedAmount: 0,
            unmatchedAmount: 0,
            pendingReviewAmount: 0,
            matchedPercentage: 0,
            unmatchedCount: 0,
            matchedCount: 0,
            pendingReviewCount: 0,
          },
          subItems: lineItem.accounts.map(acc => ({
            name: acc.name,
            amount: acc.amount,
            reconciliation: {
              totalAmount: acc.amount,
              matchedAmount: 0,
              unmatchedAmount: 0,
              pendingReviewAmount: 0,
              matchedPercentage: 0,
              unmatchedCount: 0,
              matchedCount: 0,
              pendingReviewCount: 0,
            }
          }))
        })),
        totalCurrentAssets: assets.current.reduce((sum, item) => sum + item.total, 0),
        nonCurrentAssets: assets.nonCurrent.map(lineItem => ({
          name: lineItem.name,
          amount: lineItem.total,
          reconciliation: {
            totalAmount: lineItem.total,
            matchedAmount: 0,
            unmatchedAmount: 0,
            pendingReviewAmount: 0,
            matchedPercentage: 0,
            unmatchedCount: 0,
            matchedCount: 0,
            pendingReviewCount: 0,
          },
          subItems: lineItem.accounts.map(acc => ({
            name: acc.name,
            amount: acc.amount,
            reconciliation: {
              totalAmount: acc.amount,
              matchedAmount: 0,
              unmatchedAmount: 0,
              pendingReviewAmount: 0,
              matchedPercentage: 0,
              unmatchedCount: 0,
              matchedCount: 0,
              pendingReviewCount: 0,
            }
          }))
        })),
        totalNonCurrentAssets: assets.nonCurrent.reduce((sum, item) => sum + item.total, 0),
        totalAssets,
        assetsReconciliation: {
          totalAmount: totalAssets,
          matchedAmount: 0,
          unmatchedAmount: 0,
          pendingReviewAmount: 0,
          matchedPercentage: 0,
          unmatchedCount: 0,
          matchedCount: 0,
          pendingReviewCount: 0,
        }
      },
      liabilities: {
        currentLiabilities: liabilities.current.map(lineItem => ({
          name: lineItem.name,
          amount: lineItem.total,
          reconciliation: {
            totalAmount: lineItem.total,
            matchedAmount: 0,
            unmatchedAmount: 0,
            pendingReviewAmount: 0,
            matchedPercentage: 0,
            unmatchedCount: 0,
            matchedCount: 0,
            pendingReviewCount: 0,
          },
          subItems: lineItem.accounts.map(acc => ({
            name: acc.name,
            amount: acc.amount,
            reconciliation: {
              totalAmount: acc.amount,
              matchedAmount: 0,
              unmatchedAmount: 0,
              pendingReviewAmount: 0,
              matchedPercentage: 0,
              unmatchedCount: 0,
              matchedCount: 0,
              pendingReviewCount: 0,
            }
          }))
        })),
        totalCurrentLiabilities: liabilities.current.reduce((sum, item) => sum + item.total, 0),
        nonCurrentLiabilities: liabilities.nonCurrent.map(lineItem => ({
          name: lineItem.name,
          amount: lineItem.total,
          reconciliation: {
            totalAmount: lineItem.total,
            matchedAmount: 0,
            unmatchedAmount: 0,
            pendingReviewAmount: 0,
            matchedPercentage: 0,
            unmatchedCount: 0,
            matchedCount: 0,
            pendingReviewCount: 0,
          },
          subItems: lineItem.accounts.map(acc => ({
            name: acc.name,
            amount: acc.amount,
            reconciliation: {
              totalAmount: acc.amount,
              matchedAmount: 0,
              unmatchedAmount: 0,
              pendingReviewAmount: 0,
              matchedPercentage: 0,
              unmatchedCount: 0,
              matchedCount: 0,
              pendingReviewCount: 0,
            }
          }))
        })),
        totalNonCurrentLiabilities: liabilities.nonCurrent.reduce((sum, item) => sum + item.total, 0),
        totalLiabilities,
        liabilitiesReconciliation: {
          totalAmount: totalLiabilities,
          matchedAmount: 0,
          unmatchedAmount: 0,
          pendingReviewAmount: 0,
          matchedPercentage: 0,
          unmatchedCount: 0,
          matchedCount: 0,
          pendingReviewCount: 0,
        }
      },
      equity: {
        equityItems: equity.items.map(lineItem => ({
          name: lineItem.name,
          amount: lineItem.total,
          reconciliation: {
            totalAmount: lineItem.total,
            matchedAmount: 0,
            unmatchedAmount: 0,
            pendingReviewAmount: 0,
            matchedPercentage: 0,
            unmatchedCount: 0,
            matchedCount: 0,
            pendingReviewCount: 0,
          },
          subItems: lineItem.accounts.map(acc => ({
            name: acc.name,
            amount: acc.amount,
            reconciliation: {
              totalAmount: acc.amount,
              matchedAmount: 0,
              unmatchedAmount: 0,
              pendingReviewAmount: 0,
              matchedPercentage: 0,
              unmatchedCount: 0,
              matchedCount: 0,
              pendingReviewCount: 0,
            }
          }))
        })),
        totalEquity,
        equityReconciliation: {
          totalAmount: totalEquity,
          matchedAmount: 0,
          unmatchedAmount: 0,
          pendingReviewAmount: 0,
          matchedPercentage: 0,
          unmatchedCount: 0,
          matchedCount: 0,
          pendingReviewCount: 0,
        }
      },
      overallReconciliation: {
        totalAmount: totalAssets,
        matchedAmount: 0,
        unmatchedAmount: 0,
        pendingReviewAmount: 0,
        matchedPercentage: 0,
        unmatchedCount: 0,
        matchedCount: 0,
        pendingReviewCount: 0,
      },
      balanceCheck: {
        assetsTotal: totalAssets,
        liabilitiesAndEquityTotal: totalLiabilities + totalEquity,
        isBalanced,
        difference,
      }
    };

    // Save report if requested
    if (saveReport) {
      const reportData = await db.reportData.create({
        data: {
          businessId: business.id,
          type: "BALANCE_SHEET",
          title: `Balance Sheet - ${validatedData.endDate.toLocaleDateString()}`,
          data: balanceSheetData as unknown as object,
          parameters: {
            startDate: validatedData.startDate,
            endDate: validatedData.endDate,
          },
          period: `As of ${validatedData.endDate.toLocaleDateString()}`,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          generatedBy: session.user.id,
        },
      });

      return { success: true, data: balanceSheetData, reportId: reportData.id };
    }

    return { success: true, data: balanceSheetData };
  } catch (error) {
    console.error("Error generating balance sheet:", error);
    return { success: false, error: "Failed to generate balance sheet" };
  }
}

/**
 * Generate Cash Flow Report
 */
export async function generateCashFlowReport(
  data: ReportRequest,
  saveReport: boolean = false
): Promise<{ success: boolean; data?: CashFlowData; reportId?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = reportRequestSchema.parse(data);

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Get bank account balances at start and end of period
    const bankAccounts = await db.bankAccount.findMany({
      where: { businessId: business.id },
    });

    // Calculate beginning and ending cash
    const beginningCash = bankAccounts.reduce(
      (sum, account) => sum + (account.balance || 0),
      0
    );

    // Get all transactions for the period
    const transactions = await db.transaction.findMany({
      where: {
        businessId: business.id,
        date: {
          gte: validatedData.startDate,
          lte: validatedData.endDate,
        },
      },
      include: {
        category: true,
        reconciliation: true,
      },
    });

    // Categorize transactions for cash flow statement
    const operatingTransactions: typeof transactions = [];
    const investingTransactions: typeof transactions = [];
    const financingTransactions: typeof transactions = [];

    transactions.forEach((transaction) => {
      const categoryName = transaction.category?.name || "Uncategorized";
      
      // Simple categorization based on category names (can be enhanced)
      if (
        categoryName.toLowerCase().includes("equipment") ||
        categoryName.toLowerCase().includes("property") ||
        categoryName.toLowerCase().includes("investment")
      ) {
        investingTransactions.push(transaction);
      } else if (
        categoryName.toLowerCase().includes("loan") ||
        categoryName.toLowerCase().includes("equity") ||
        categoryName.toLowerCase().includes("dividend")
      ) {
        financingTransactions.push(transaction);
      } else {
        // Most transactions are operating activities
        operatingTransactions.push(transaction);
      }
    });

    // Calculate cash flows by activity
    const operatingActivities = calculateCashFlowSection(
      "Operating Activities",
      operatingTransactions
    );
    const investingActivities = calculateCashFlowSection(
      "Investing Activities",
      investingTransactions
    );
    const financingActivities = calculateCashFlowSection(
      "Financing Activities",
      financingTransactions
    );

    // Calculate net cash change
    const netCashChange =
      (operatingActivities.netCashFromOperating || 0) +
      (investingActivities.netCashFromInvesting || 0) +
      (financingActivities.netCashFromFinancing || 0);

    const endingCash = beginningCash + netCashChange;

    // Calculate overall reconciliation
    const overallReconciliation = calculateReconciliationBreakdown(transactions);

    const period = `${validatedData.startDate.toLocaleDateString()} - ${validatedData.endDate.toLocaleDateString()}`;

    const reportData: CashFlowData = {
      period,
      startDate: validatedData.startDate.toLocaleDateString(),
      endDate: validatedData.endDate.toLocaleDateString(),
      beginningCash,
      endingCash,
      netCashChange,
      operatingActivities: {
        items: operatingActivities.items,
        netCashFromOperating: operatingActivities.netCashFromOperating || 0,
        reconciliation: operatingActivities.reconciliation,
      },
      investingActivities: {
        items: investingActivities.items,
        netCashFromInvesting: investingActivities.netCashFromInvesting || 0,
        reconciliation: investingActivities.reconciliation,
      },
      financingActivities: {
        items: financingActivities.items,
        netCashFromFinancing: financingActivities.netCashFromFinancing || 0,
        reconciliation: financingActivities.reconciliation,
      },
      overallReconciliation,
    };

    // Save report if requested
    let reportId: string | undefined;
    if (saveReport) {
      const saveResult = await saveGeneratedReport({
        type: "CASH_FLOW",
        title: `Cash Flow Statement - ${period}`,
        data: reportData,
        parameters: {
          type: data.type,
          startDate: data.startDate,
          endDate: data.endDate,
          period: data.period,
        },
        period: data.period || "custom",
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
      });

      if (saveResult.success) {
        reportId = saveResult.reportId;
      }
    }

    return { success: true, data: reportData, reportId };
  } catch (error) {
    console.error("Error generating cash flow report:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid request data" };
    }
    return { success: false, error: "Failed to generate cash flow report" };
  }
}

/**
 * Helper function to calculate cash flow for a section
 */
function calculateCashFlowSection(
  sectionName: string,
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    category?: { name: string } | null;
    reconciliation?: {
      status: string;
    } | null;
  }>
): {
  items: CashFlowItem[];
  netCashFromOperating?: number;
  netCashFromInvesting?: number;
  netCashFromFinancing?: number;
  reconciliation: ReconciliationBreakdown;
} {
  // Group transactions by category
  const categoryMap = new Map<
    string,
    {
      transactions: typeof transactions;
      totalCashIn: number;
      totalCashOut: number;
    }
  >();

  transactions.forEach((transaction) => {
    const categoryName = transaction.category?.name || "Uncategorized";
    const existing = categoryMap.get(categoryName) || {
      transactions: [],
      totalCashIn: 0,
      totalCashOut: 0,
    };

    existing.transactions.push(transaction);
    if (transaction.type === "INCOME") {
      existing.totalCashIn += Math.abs(transaction.amount);
    } else {
      existing.totalCashOut += Math.abs(transaction.amount);
    }

    categoryMap.set(categoryName, existing);
  });

  // Create cash flow items
  const items: CashFlowItem[] = [];
  let totalCashFlow = 0;

  categoryMap.forEach((data, category) => {
    const netAmount = data.totalCashIn - data.totalCashOut;
    if (netAmount !== 0) {
      items.push({
        description: category,
        amount: netAmount,
        reconciliation: calculateReconciliationBreakdown(data.transactions),
      });
      totalCashFlow += netAmount;
    }
  });

  // Sort items by absolute amount (largest first)
  items.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  // Calculate section reconciliation
  const reconciliation = calculateReconciliationBreakdown(transactions);

  // Return with appropriate property name
  const result: {
    items: CashFlowItem[];
    netCashFromOperating?: number;
    netCashFromInvesting?: number;
    netCashFromFinancing?: number;
    reconciliation: ReconciliationBreakdown;
  } = {
    items,
    reconciliation,
  };

  if (sectionName === "Operating Activities") {
    result.netCashFromOperating = totalCashFlow;
  } else if (sectionName === "Investing Activities") {
    result.netCashFromInvesting = totalCashFlow;
  } else if (sectionName === "Financing Activities") {
    result.netCashFromFinancing = totalCashFlow;
  }

  return result;
}

/**
 * Get account balance history for debugging
 */
export async function getAccountBalanceDetails(accountId: string, endDate: Date): Promise<{
  success: boolean;
  account?: {
    id: string;
    name: string;
    accountCode: string;
    accountType: string;
  };
  entries?: Array<{
    date: Date;
    description: string;
    debit: number;
    credit: number;
    change: number;
    balance: number;
  }>;
  finalBalance?: number;
  error?: string;
}> {
  try {
    const journalEntries = await db.journalEntry.findMany({
      where: {
        accountId,
        transaction: {
          date: {
            lte: endDate,
          },
        },
      },
      include: {
        transaction: true,
        account: true,
      },
      orderBy: {
        transaction: {
          date: 'asc',
        },
      },
    });

    let runningBalance = 0;
    const entries = journalEntries.map(entry => {
      const debit = entry.debitAmount || 0;
      const credit = entry.creditAmount || 0;
      
      // Calculate balance change based on account type
      let change = 0;
      switch (entry.account.accountType) {
        case "ASSET":
        case "EXPENSE":
          change = debit - credit;
          break;
        case "LIABILITY":
        case "EQUITY":
        case "INCOME":
          change = credit - debit;
          break;
      }
      
      runningBalance += change;
      
      return {
        date: entry.transaction.date,
        description: entry.transaction.description || "",
        debit,
        credit,
        change,
        balance: runningBalance,
      };
    });

    return {
      success: true,
      account: journalEntries[0]?.account,
      entries,
      finalBalance: runningBalance,
    };
  } catch (error) {
    console.error("Error getting account balance details:", error);
    return { success: false, error: "Failed to get account details" };
  }
}