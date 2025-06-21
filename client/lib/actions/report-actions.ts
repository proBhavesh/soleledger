"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Validation schemas
const reportRequestSchema = z.object({
  type: z.enum([
    "PROFIT_LOSS",
    "EXPENSE_CATEGORIES",
    "CASH_FLOW",
    "BALANCE_SHEET",
  ]),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  period: z.enum(["custom", "month", "quarter", "year"]).optional(),
});

export interface ReportRequest {
  type: "PROFIT_LOSS" | "EXPENSE_CATEGORIES" | "CASH_FLOW" | "BALANCE_SHEET";
  startDate: string;
  endDate: string;
  period?: "custom" | "month" | "quarter" | "year";
}

export interface ReconciliationBreakdown {
  totalAmount: number;
  matchedAmount: number;
  unmatchedAmount: number;
  pendingReviewAmount: number;
  matchedPercentage: number;
  unmatchedCount: number;
  matchedCount: number;
  pendingReviewCount: number;
}

export interface CategoryWithReconciliation {
  category: string;
  amount: number;
  percentage: number;
  reconciliation: ReconciliationBreakdown;
}

export interface ProfitLossData {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  incomeByCategory: CategoryWithReconciliation[];
  expensesByCategory: CategoryWithReconciliation[];
  // Overall reconciliation summary
  incomeReconciliation: ReconciliationBreakdown;
  expenseReconciliation: ReconciliationBreakdown;
  overallReconciliation: ReconciliationBreakdown;
}

export interface ExpenseCategoriesData {
  period: string;
  totalExpenses: number;
  categories: Array<{
    category: string;
    amount: number;
    percentage: number;
    transactionCount: number;
    reconciliation: ReconciliationBreakdown;
  }>;
  overallReconciliation: ReconciliationBreakdown;
}

export interface ReconciliationSummaryReport {
  period: string;
  overallSummary: ReconciliationBreakdown;
  unmatchedTransactions: Array<{
    id: string;
    date: Date;
    amount: number;
    description: string | null;
    category: string | null;
    type: "INCOME" | "EXPENSE";
    bankAccount: string | null;
  }>;
  pendingReviewTransactions: Array<{
    id: string;
    date: Date;
    amount: number;
    description: string | null;
    category: string | null;
    type: "INCOME" | "EXPENSE";
    bankAccount: string | null;
    confidence: number | null;
  }>;
  complianceByCategory: Array<{
    category: string;
    type: "INCOME" | "EXPENSE";
    reconciliation: ReconciliationBreakdown;
  }>;
  riskAssessment: {
    highRiskAmount: number;
    mediumRiskAmount: number;
    lowRiskAmount: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  };
}

export interface BalanceSheetItem {
  name: string;
  amount: number;
  reconciliation: ReconciliationBreakdown;
  subItems?: BalanceSheetItem[];
}

export interface BalanceSheetData {
  period: string;
  asOfDate: string;
  assets: {
    currentAssets: BalanceSheetItem[];
    totalCurrentAssets: number;
    nonCurrentAssets: BalanceSheetItem[];
    totalNonCurrentAssets: number;
    totalAssets: number;
    assetsReconciliation: ReconciliationBreakdown;
  };
  liabilities: {
    currentLiabilities: BalanceSheetItem[];
    totalCurrentLiabilities: number;
    nonCurrentLiabilities: BalanceSheetItem[];
    totalNonCurrentLiabilities: number;
    totalLiabilities: number;
    liabilitiesReconciliation: ReconciliationBreakdown;
  };
  equity: {
    equityItems: BalanceSheetItem[];
    totalEquity: number;
    equityReconciliation: ReconciliationBreakdown;
  };
  overallReconciliation: ReconciliationBreakdown;
  balanceCheck: {
    assetsTotal: number;
    liabilitiesAndEquityTotal: number;
    isBalanced: boolean;
    difference: number;
  };
}

/**
 * Generate Profit & Loss Report with Reconciliation Status
 */
export async function generateProfitLossReport(
  data: ReportRequest
): Promise<{ success: boolean; data?: ProfitLossData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = reportRequestSchema.parse(data);

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
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

    return { success: true, data: reportData };
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
  data: ReportRequest
): Promise<{ success: boolean; data?: ExpenseCategoriesData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = reportRequestSchema.parse(data);

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
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

    return { success: true, data: reportData };
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
  data: ReportRequest
): Promise<{
  success: boolean;
  data?: ReconciliationSummaryReport;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = reportRequestSchema.parse(data);

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
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

    return { success: true, data: reportData };
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
 * Generate Balance Sheet Report
 */
export async function generateBalanceSheetReport(
  data: ReportRequest
): Promise<{ success: boolean; data?: BalanceSheetData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = reportRequestSchema.parse(data);

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Get all Chart of Accounts categories for the business
    const allCategories = await db.category.findMany({
      where: {
        businessId: business.id,
        isActive: true,
      },
      include: {
        transactions: {
          where: {
            date: {
              lte: validatedData.endDate,
            },
          },
          include: {
            reconciliation: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { accountCode: "asc" }],
    });

    // Get bank account balances as of the end date
    const bankAccounts = await db.bankAccount.findMany({
      where: {
        businessId: business.id,
      },
    });

    // Calculate total cash from bank accounts (most recent balances)
    const totalCash = bankAccounts.reduce(
      (sum, account) => sum + (account.balance || 0),
      0
    );

    // Build Balance Sheet using Chart of Accounts structure

    // ASSETS
    const assetCategories = allCategories.filter(
      (cat) => cat.accountType === "ASSET"
    );

    const currentAssets: BalanceSheetItem[] = [];
    const nonCurrentAssets: BalanceSheetItem[] = [];

    // Add cash from bank accounts as first asset
    if (totalCash !== 0) {
      const cashTransactions = allCategories
        .filter((cat) => cat.accountCode.startsWith("10")) // Cash accounts typically 1000-1099
        .flatMap((cat) => cat.transactions);

      currentAssets.push({
        name: "Cash and Bank Accounts",
        amount: totalCash,
        reconciliation: calculateReconciliationBreakdown(cashTransactions),
      });
    }

    // Process other asset categories
    assetCategories.forEach((category) => {
      const categoryBalance = category.transactions.reduce(
        (sum, transaction) => {
          // For assets: debits increase, credits decrease
          // Income transactions to asset accounts are credits (decrease)
          // Expense transactions from asset accounts are debits (increase)
          if (transaction.type === "EXPENSE") {
            return sum + Math.abs(transaction.amount); // Debit increases asset
          } else {
            return sum - Math.abs(transaction.amount); // Credit decreases asset
          }
        },
        0
      );

      if (Math.abs(categoryBalance) > 0.01) {
        // Only include accounts with balances
        const balanceSheetItem: BalanceSheetItem = {
          name: `${category.accountCode} - ${category.name}`,
          amount: categoryBalance,
          reconciliation: calculateReconciliationBreakdown(
            category.transactions
          ),
        };

        // Categorize as current vs non-current based on account code
        const accountCodeNum = parseInt(category.accountCode);
        if (accountCodeNum < 1500) {
          currentAssets.push(balanceSheetItem);
        } else {
          nonCurrentAssets.push(balanceSheetItem);
        }
      }
    });

    const totalCurrentAssets = currentAssets.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const totalNonCurrentAssets = nonCurrentAssets.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    // LIABILITIES
    const liabilityCategories = allCategories.filter(
      (cat) => cat.accountType === "LIABILITY"
    );

    const currentLiabilities: BalanceSheetItem[] = [];
    const nonCurrentLiabilities: BalanceSheetItem[] = [];

    liabilityCategories.forEach((category) => {
      const categoryBalance = category.transactions.reduce(
        (sum, transaction) => {
          // For liabilities: credits increase, debits decrease
          // Expense transactions to liability accounts are debits (decrease)
          // Income transactions from liability accounts are credits (increase)
          if (transaction.type === "INCOME") {
            return sum + Math.abs(transaction.amount); // Credit increases liability
          } else {
            return sum - Math.abs(transaction.amount); // Debit decreases liability
          }
        },
        0
      );

      if (Math.abs(categoryBalance) > 0.01) {
        // Only include accounts with balances
        const balanceSheetItem: BalanceSheetItem = {
          name: `${category.accountCode} - ${category.name}`,
          amount: Math.abs(categoryBalance), // Show as positive for balance sheet
          reconciliation: calculateReconciliationBreakdown(
            category.transactions
          ),
        };

        // Categorize as current vs non-current based on account code
        const accountCodeNum = parseInt(category.accountCode);
        if (accountCodeNum < 2500) {
          currentLiabilities.push(balanceSheetItem);
        } else {
          nonCurrentLiabilities.push(balanceSheetItem);
        }
      }
    });

    const totalCurrentLiabilities = currentLiabilities.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const totalLiabilities =
      totalCurrentLiabilities + totalNonCurrentLiabilities;

    // EQUITY
    const equityCategories = allCategories.filter(
      (cat) => cat.accountType === "EQUITY"
    );

    const equityItems: BalanceSheetItem[] = [];

    // Calculate retained earnings from income and expense accounts
    const incomeCategories = allCategories.filter(
      (cat) => cat.accountType === "INCOME"
    );
    const expenseCategories = allCategories.filter(
      (cat) => cat.accountType === "EXPENSE"
    );

    const totalIncome = incomeCategories.reduce((sum, category) => {
      return (
        sum +
        category.transactions.reduce((catSum, transaction) => {
          return catSum + Math.abs(transaction.amount);
        }, 0)
      );
    }, 0);

    const totalExpenses = expenseCategories.reduce((sum, category) => {
      return (
        sum +
        category.transactions.reduce((catSum, transaction) => {
          return catSum + Math.abs(transaction.amount);
        }, 0)
      );
    }, 0);

    const currentYearEarnings = totalIncome - totalExpenses;

    // Add current year earnings
    const allIncomeExpenseTransactions = [
      ...incomeCategories.flatMap((cat) => cat.transactions),
      ...expenseCategories.flatMap((cat) => cat.transactions),
    ];

    equityItems.push({
      name: "Current Year Earnings",
      amount: currentYearEarnings,
      reconciliation: calculateReconciliationBreakdown(
        allIncomeExpenseTransactions
      ),
    });

    // Add other equity accounts
    equityCategories.forEach((category) => {
      const categoryBalance = category.transactions.reduce(
        (sum, transaction) => {
          // For equity: credits increase, debits decrease
          if (transaction.type === "INCOME") {
            return sum + Math.abs(transaction.amount);
          } else {
            return sum - Math.abs(transaction.amount);
          }
        },
        0
      );

      if (Math.abs(categoryBalance) > 0.01) {
        equityItems.push({
          name: `${category.accountCode} - ${category.name}`,
          amount: categoryBalance,
          reconciliation: calculateReconciliationBreakdown(
            category.transactions
          ),
        });
      }
    });

    const totalEquity = equityItems.reduce((sum, item) => sum + item.amount, 0);

    // Calculate reconciliation summaries
    const assetTransactions = assetCategories.flatMap(
      (cat) => cat.transactions
    );
    const liabilityTransactions = liabilityCategories.flatMap(
      (cat) => cat.transactions
    );
    const equityTransactions = [
      ...equityCategories.flatMap((cat) => cat.transactions),
      ...allIncomeExpenseTransactions,
    ];
    const allTransactions = [
      ...assetTransactions,
      ...liabilityTransactions,
      ...equityTransactions,
    ];

    const assetsReconciliation =
      calculateReconciliationBreakdown(assetTransactions);
    const liabilitiesReconciliation = calculateReconciliationBreakdown(
      liabilityTransactions
    );
    const equityReconciliation =
      calculateReconciliationBreakdown(equityTransactions);
    const overallReconciliation =
      calculateReconciliationBreakdown(allTransactions);

    // Balance check
    const liabilitiesAndEquityTotal = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - liabilitiesAndEquityTotal) < 0.01;
    const difference = totalAssets - liabilitiesAndEquityTotal;

    const period = `As of ${validatedData.endDate.toLocaleDateString()}`;
    const asOfDate = validatedData.endDate.toLocaleDateString();

    const reportData: BalanceSheetData = {
      period,
      asOfDate,
      assets: {
        currentAssets,
        totalCurrentAssets,
        nonCurrentAssets,
        totalNonCurrentAssets,
        totalAssets,
        assetsReconciliation,
      },
      liabilities: {
        currentLiabilities,
        totalCurrentLiabilities,
        nonCurrentLiabilities,
        totalNonCurrentLiabilities,
        totalLiabilities,
        liabilitiesReconciliation,
      },
      equity: {
        equityItems,
        totalEquity,
        equityReconciliation,
      },
      overallReconciliation,
      balanceCheck: {
        assetsTotal: totalAssets,
        liabilitiesAndEquityTotal,
        isBalanced,
        difference,
      },
    };

    return { success: true, data: reportData };
  } catch (error) {
    console.error("Error generating balance sheet report:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid request data" };
    }
    return { success: false, error: "Failed to generate balance sheet report" };
  }
}
