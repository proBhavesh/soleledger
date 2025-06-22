import { z } from "zod";

// =======================================================
// Report Request Types
// =======================================================

export const reportRequestSchema = z.object({
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

// =======================================================
// Common Report Types
// =======================================================

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

// =======================================================
// Profit & Loss Report Types
// =======================================================

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

// =======================================================
// Expense Categories Report Types
// =======================================================

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

// =======================================================
// Reconciliation Summary Report Types
// =======================================================

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

// =======================================================
// Balance Sheet Report Types
// =======================================================

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

// =======================================================
// Cash Flow Report Types
// =======================================================

export interface CashFlowItem {
  description: string;
  amount: number;
  reconciliation: ReconciliationBreakdown;
}

export interface CashFlowData {
  period: string;
  startDate: string;
  endDate: string;
  beginningCash: number;
  endingCash: number;
  netCashChange: number;
  operatingActivities: {
    items: CashFlowItem[];
    netCashFromOperating: number;
    reconciliation: ReconciliationBreakdown;
  };
  investingActivities: {
    items: CashFlowItem[];
    netCashFromInvesting: number;
    reconciliation: ReconciliationBreakdown;
  };
  financingActivities: {
    items: CashFlowItem[];
    netCashFromFinancing: number;
    reconciliation: ReconciliationBreakdown;
  };
  overallReconciliation: ReconciliationBreakdown;
}

// =======================================================
// Report Persistence Types
// =======================================================

export interface SaveReportInput {
  type: "PROFIT_LOSS" | "BALANCE_SHEET" | "CASH_FLOW" | "EXPENSE_CATEGORIES" | "RECONCILIATION_SUMMARY" | "TAX_SUMMARY" | "MONTHLY_SUMMARY";
  title: string;
  data: ProfitLossData | BalanceSheetData | CashFlowData | ExpenseCategoriesData | ReconciliationSummaryReport;
  parameters: {
    type: string;
    startDate: string;
    endDate: string;
    period?: string;
  };
  period: string;
  startDate: Date;
  endDate: Date;
}

export interface ReportHistoryFilters {
  type?: "PROFIT_LOSS" | "BALANCE_SHEET" | "CASH_FLOW" | "EXPENSE_CATEGORIES" | "RECONCILIATION_SUMMARY" | "TAX_SUMMARY" | "MONTHLY_SUMMARY";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface SavedReport {
  id: string;
  type: "PROFIT_LOSS" | "BALANCE_SHEET" | "CASH_FLOW" | "EXPENSE_CATEGORIES" | "RECONCILIATION_SUMMARY" | "TAX_SUMMARY" | "MONTHLY_SUMMARY";
  title: string;
  data: ProfitLossData | BalanceSheetData | CashFlowData | ExpenseCategoriesData | ReconciliationSummaryReport | Record<string, unknown>;
  parameters: {
    type: string;
    startDate: string;
    endDate: string;
    period?: string;
  };
  period: string;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  generatedBy: string;
}

// =======================================================
// Response Types
// =======================================================

export interface GenerateReportResponse<T> {
  success: boolean;
  data?: T;
  reportId?: string;
  error?: string;
}

export interface ReportHistoryResponse {
  success: boolean;
  reports?: SavedReport[];
  total?: number;
  error?: string;
}

export interface ReportStatistics {
  totalReports: number;
  reportsByType: Record<string, number>;
  recentReports: number;
  scheduledReports: number;
}