"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileBarChart,
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateProfitLossReport,
  generateExpenseCategoriesReport,
  generateReconciliationSummaryReport,
  generateBalanceSheetReport,
  generateCashFlowReport,
} from "@/lib/actions/report-actions";
import type {
  ProfitLossData,
  ExpenseCategoriesData,
  ReconciliationBreakdown,
  ReconciliationSummaryReport,
  BalanceSheetData,
  CashFlowData,
} from "@/lib/types/reports";
import { ReportHistory } from "@/components/dashboard/reports/report-history";
import { getLatestReports } from "@/lib/actions/report-persistence-actions";
import {
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  exportProfitLossReportToPDF,
  exportBalanceSheetToPDF,
  exportCashFlowReportToPDF,
  exportExpenseCategoriesReportToPDF,
  exportAllReportsToPDF,
  downloadPDF,
} from "@/lib/services/pdf-export-service";
import { useBusinessContext } from "@/lib/contexts/business-context";
import type { jsPDF } from "jspdf";

export default function ReportsPage() {
  const { selectedBusiness } = useBusinessContext();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [isGenerating, setIsGenerating] = useState(false);
  const [profitLossData, setProfitLossData] = useState<ProfitLossData | null>(
    null
  );
  const [expenseData, setExpenseData] = useState<ExpenseCategoriesData | null>(
    null
  );
  const [reconciliationData, setReconciliationData] =
    useState<ReconciliationSummaryReport | null>(null);
  const [balanceSheetData, setBalanceSheetData] =
    useState<BalanceSheetData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [activeTab, setActiveTab] = useState("profit-loss");
  const [isLoadingLatest, setIsLoadingLatest] = useState(true);
  const [lastLoadedDate, setLastLoadedDate] = useState<Date | null>(null);

  const getPeriodDates = (period: string) => {
    const now = new Date();
    switch (period) {
      case "week":
        return { start: subDays(now, 7), end: now };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "quarter":
        const quarterStart = new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1
        );
        const quarterEnd = endOfMonth(
          new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 2, 1)
        );
        return { start: quarterStart, end: quarterEnd };
      case "year":
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const generateReports = async (saveReports: boolean = false) => {
    try {
      setIsGenerating(true);
      const { start, end } = getPeriodDates(selectedPeriod);

      // Generate P&L Report
      const plResult = await generateProfitLossReport(
        {
          type: "PROFIT_LOSS" as const,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          period: selectedPeriod as "month" | "quarter" | "year" | "custom",
        },
        saveReports
      );

      if (plResult.success && plResult.data) {
        setProfitLossData(plResult.data);
      }

      // Generate Expense Categories Report
      const expenseResult = await generateExpenseCategoriesReport(
        {
          type: "EXPENSE_CATEGORIES" as const,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          period: selectedPeriod as "month" | "quarter" | "year" | "custom",
        },
        saveReports
      );

      if (expenseResult.success && expenseResult.data) {
        setExpenseData(expenseResult.data);
      }

      // Generate Reconciliation Summary Report
      const reconciliationResult = await generateReconciliationSummaryReport(
        {
          type: "CASH_FLOW" as const, // Using CASH_FLOW as placeholder
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          period: selectedPeriod as "month" | "quarter" | "year" | "custom",
        },
        saveReports
      );

      if (reconciliationResult.success && reconciliationResult.data) {
        setReconciliationData(reconciliationResult.data);
      }

      // Generate Balance Sheet Report
      const balanceSheetResult = await generateBalanceSheetReport(
        {
          type: "BALANCE_SHEET" as const,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          period: selectedPeriod as "month" | "quarter" | "year" | "custom",
        },
        saveReports
      );

      // Generate Cash Flow Report
      const cashFlowResult = await generateCashFlowReport(
        {
          type: "CASH_FLOW" as const,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          period: selectedPeriod as "month" | "quarter" | "year" | "custom",
        },
        saveReports
      );

      if (balanceSheetResult.success && balanceSheetResult.data) {
        setBalanceSheetData(balanceSheetResult.data);
      }

      if (cashFlowResult.success && cashFlowResult.data) {
        setCashFlowData(cashFlowResult.data);
      }

      toast.success("Reports generated and saved successfully");
    } catch {
      toast.error("Failed to generate reports");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getReconciliationBadge = (percentage: number) => {
    if (percentage >= 90) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Excellent
        </Badge>
      );
    }
    if (percentage >= 70) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Good
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Needs Attention
      </Badge>
    );
  };

  const getRiskBadge = (riskLevel: "LOW" | "MEDIUM" | "HIGH") => {
    switch (riskLevel) {
      case "LOW":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Low Risk
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Medium Risk
          </Badge>
        );
      case "HIGH":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            High Risk
          </Badge>
        );
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  // PDF Export functions
  const exportCurrentReportToPDF = () => {
    try {
      const exportOptions = {
        businessName: selectedBusiness?.name || 'Business Report',
        period: selectedPeriod === 'month' ? 'This Month' : 
                selectedPeriod === 'quarter' ? 'This Quarter' : 
                selectedPeriod === 'year' ? 'This Year' : 'This Week',
        generatedDate: new Date()
      };

      let doc: jsPDF | undefined;
      let filename = '';

      switch (activeTab) {
        case 'profit-loss':
          if (!profitLossData) {
            toast.error("No P&L data to export");
            return;
          }
          doc = exportProfitLossReportToPDF(profitLossData, exportOptions);
          filename = `profit-loss-${new Date().toISOString().split('T')[0]}.pdf`;
          break;

        case 'balance-sheet':
          if (!balanceSheetData) {
            toast.error("No balance sheet data to export");
            return;
          }
          doc = exportBalanceSheetToPDF(balanceSheetData, exportOptions);
          filename = `balance-sheet-${new Date().toISOString().split('T')[0]}.pdf`;
          break;

        case 'cash-flow':
          if (!cashFlowData) {
            toast.error("No cash flow data to export");
            return;
          }
          doc = exportCashFlowReportToPDF(cashFlowData, exportOptions);
          filename = `cash-flow-${new Date().toISOString().split('T')[0]}.pdf`;
          break;

        case 'expenses':
          if (!expenseData) {
            toast.error("No expense data to export");
            return;
          }
          doc = exportExpenseCategoriesReportToPDF(expenseData, exportOptions);
          filename = `expense-categories-${new Date().toISOString().split('T')[0]}.pdf`;
          break;

        default:
          toast.error("Please select a report to export");
          return;
      }

      if (doc) {
        downloadPDF(doc, filename);
        toast.success("Report exported successfully");
      }
    } catch (error) {
      console.error("Failed to export PDF:", error);
      toast.error("Failed to export report");
    }
  };

  const handleExportAllReportsToPDF = () => {
    try {
      if (!profitLossData && !balanceSheetData && !cashFlowData && !expenseData) {
        toast.error("No reports to export");
        return;
      }

      const doc = exportAllReportsToPDF(
        {
          profitLoss: profitLossData || undefined,
          balanceSheet: balanceSheetData || undefined,
          cashFlow: cashFlowData || undefined,
          expenseCategories: expenseData || undefined,
        },
        {
          businessName: selectedBusiness?.name || 'Business Report',
          period: selectedPeriod === 'month' ? 'This Month' : 
                  selectedPeriod === 'quarter' ? 'This Quarter' : 
                  selectedPeriod === 'year' ? 'This Year' : 'This Week',
          generatedDate: new Date()
        }
      );

      const filename = `all-reports-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPDF(doc, filename);
      toast.success("All reports exported successfully");
    } catch (error) {
      console.error("Failed to export all PDFs:", error);
      toast.error("Failed to export all reports");
    }
  };

  // Load latest reports on mount
  useEffect(() => {
    const loadLatestReports = async () => {
      try {
        setIsLoadingLatest(true);
        const result = await getLatestReports();
        
        if (result.success && result.reports) {
          if (result.reports.profitLoss) {
            setProfitLossData(result.reports.profitLoss.data as ProfitLossData);
            setLastLoadedDate(result.reports.profitLoss.generatedAt);
          }
          if (result.reports.balanceSheet) {
            setBalanceSheetData(result.reports.balanceSheet.data as BalanceSheetData);
          }
          if (result.reports.cashFlow) {
            setCashFlowData(result.reports.cashFlow.data as CashFlowData);
          }
          if (result.reports.expenseCategories) {
            setExpenseData(result.reports.expenseCategories.data as ExpenseCategoriesData);
          }
          if (result.reports.reconciliationSummary) {
            setReconciliationData(result.reports.reconciliationSummary.data as ReconciliationSummaryReport);
          }
        }
      } catch (error) {
        console.error("Failed to load latest reports:", error);
      } finally {
        setIsLoadingLatest(false);
      }
    };

    loadLatestReports();
  }, []);

  const ReconciliationSummaryCard = ({
    title,
    reconciliation,
    icon: Icon,
  }: {
    title: string;
    reconciliation: ReconciliationBreakdown;
    icon: React.ElementType;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Documentation Status
            </span>
            {getReconciliationBadge(reconciliation.matchedPercentage)}
          </div>
          <Progress value={reconciliation.matchedPercentage} className="h-2" />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium text-green-600">
                {formatCurrency(reconciliation.matchedAmount)}
              </div>
              <div className="text-muted-foreground">Documented</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-red-600">
                {formatCurrency(reconciliation.unmatchedAmount)}
              </div>
              <div className="text-muted-foreground">Missing Docs</div>
            </div>
          </div>
          {reconciliation.pendingReviewAmount > 0 && (
            <div className="text-center text-xs">
              <div className="font-medium text-yellow-600">
                {formatCurrency(reconciliation.pendingReviewAmount)}
              </div>
              <div className="text-muted-foreground">Pending Review</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            Generate comprehensive financial reports with documentation
            compliance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => generateReports(true)} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileBarChart className="h-4 w-4 mr-2" />
            )}
            Generate Reports
          </Button>
          {(profitLossData || balanceSheetData || cashFlowData || expenseData) && (
            <>
              <Button 
                onClick={exportCurrentReportToPDF} 
                variant="outline"
                disabled={activeTab === "reconciliation" || activeTab === "history"}
                title="Export current report to PDF"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                onClick={handleExportAllReportsToPDF} 
                variant="outline"
                title="Export all reports to PDF"
              >
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Latest Report Info */}
      {lastLoadedDate && !isLoadingLatest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  Showing Last Generated Reports
                </h4>
                <p className="text-sm text-blue-700">
                  Generated on {formatDate(lastLoadedDate)}. Click &quot;Generate Reports&quot; to refresh with latest data.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateReports(true)}
              disabled={isGenerating}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Features Info */}
      {profitLossData && !lastLoadedDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                Enhanced Compliance Reporting
              </h4>
              <p className="text-sm text-blue-700">
                All transactions are included in P&L calculations as expected.
                Unmatched transactions ($
                {formatCurrency(
                  profitLossData.overallReconciliation.unmatchedAmount
                )}
                ) are clearly flagged as needing supporting documentation for
                audit compliance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {profitLossData && !isLoadingLatest && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(profitLossData.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                {profitLossData.period}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">
                  {profitLossData.incomeReconciliation.matchedPercentage.toFixed(
                    1
                  )}
                  % documented
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(profitLossData.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                {profitLossData.period}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">
                  {profitLossData.expenseReconciliation.matchedPercentage.toFixed(
                    1
                  )}
                  % documented
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <PieChart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  profitLossData.netIncome >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(profitLossData.netIncome)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    profitLossData.netIncome >= 0 ? "default" : "destructive"
                  }
                >
                  {profitLossData.netIncome >= 0 ? "Profit" : "Loss"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Documentation
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profitLossData.overallReconciliation.matchedPercentage.toFixed(
                  1
                )}
                %
              </div>
              <p className="text-xs text-muted-foreground">Compliance Rate</p>
              <div className="mt-1">
                {getReconciliationBadge(
                  profitLossData.overallReconciliation.matchedPercentage
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reconciliation Summary Cards */}
      {profitLossData && !isLoadingLatest && (
        <div className="grid gap-4 md:grid-cols-3">
          <ReconciliationSummaryCard
            title="Income Documentation"
            reconciliation={profitLossData.incomeReconciliation}
            icon={TrendingUp}
          />
          <ReconciliationSummaryCard
            title="Expense Documentation"
            reconciliation={profitLossData.expenseReconciliation}
            icon={DollarSign}
          />
          <ReconciliationSummaryCard
            title="Overall Compliance"
            reconciliation={profitLossData.overallReconciliation}
            icon={FileText}
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="expenses">Expense Categories</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="profit-loss" className="space-y-4">
          {isLoadingLatest ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                  <p className="text-muted-foreground">
                    Loading last generated report...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : profitLossData ? (
            <>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const doc = exportProfitLossReportToPDF(profitLossData, {
                      businessName: selectedBusiness?.name || 'Business Report',
                      period: profitLossData.period,
                      generatedDate: new Date()
                    });
                    downloadPDF(doc, `profit-loss-${new Date().toISOString().split('T')[0]}.pdf`);
                    toast.success("P&L report exported");
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export P&L to PDF
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Income by Category</CardTitle>
                  <CardDescription>
                    Breakdown of income sources with documentation status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profitLossData.incomeByCategory.length > 0 ? (
                    <div className="space-y-4">
                      {profitLossData.incomeByCategory
                        .slice(0, 5)
                        .map((item, index) => (
                          <div
                            key={index}
                            className="p-3 border rounded-lg space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">
                                {item.category}
                              </span>
                              <div className="text-right">
                                <div className="font-medium">
                                  {formatCurrency(item.amount)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Documentation:{" "}
                                {item.reconciliation.matchedPercentage.toFixed(
                                  1
                                )}
                                %
                              </span>
                              {getReconciliationBadge(
                                item.reconciliation.matchedPercentage
                              )}
                            </div>
                            <Progress
                              value={item.reconciliation.matchedPercentage}
                              className="h-1"
                            />
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-green-600">
                                ✓{" "}
                                {formatCurrency(
                                  item.reconciliation.matchedAmount
                                )}
                              </div>
                              <div className="text-red-600">
                                ⚠{" "}
                                {formatCurrency(
                                  item.reconciliation.unmatchedAmount
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No income data available
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                  <CardDescription>
                    Breakdown of business expenses with documentation status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profitLossData.expensesByCategory.length > 0 ? (
                    <div className="space-y-4">
                      {profitLossData.expensesByCategory
                        .slice(0, 5)
                        .map((item, index) => (
                          <div
                            key={index}
                            className="p-3 border rounded-lg space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">
                                {item.category}
                              </span>
                              <div className="text-right">
                                <div className="font-medium">
                                  {formatCurrency(item.amount)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Documentation:{" "}
                                {item.reconciliation.matchedPercentage.toFixed(
                                  1
                                )}
                                %
                              </span>
                              {getReconciliationBadge(
                                item.reconciliation.matchedPercentage
                              )}
                            </div>
                            <Progress
                              value={item.reconciliation.matchedPercentage}
                              className="h-1"
                            />
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-green-600">
                                ✓{" "}
                                {formatCurrency(
                                  item.reconciliation.matchedAmount
                                )}
                              </div>
                              <div className="text-red-600">
                                ⚠{" "}
                                {formatCurrency(
                                  item.reconciliation.unmatchedAmount
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No expense data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <FileBarChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Generate reports to view P&L data
                  </p>
                  <Button
                    onClick={() => generateReports(true)}
                    className="mt-2"
                    disabled={isGenerating}
                  >
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="balance-sheet" className="space-y-4">
          {isLoadingLatest ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                  <p className="text-muted-foreground">
                    Loading last generated report...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : balanceSheetData ? (
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const doc = exportBalanceSheetToPDF(balanceSheetData, {
                      businessName: selectedBusiness?.name || 'Business Report',
                      period: `As of ${formatDate(balanceSheetData.asOfDate)}`,
                      generatedDate: new Date()
                    });
                    downloadPDF(doc, `balance-sheet-${new Date().toISOString().split('T')[0]}.pdf`);
                    toast.success("Balance Sheet exported");
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Balance Sheet to PDF
                </Button>
              </div>
              {/* Balance Sheet Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Balance Sheet
                    <Badge
                      className={
                        balanceSheetData.balanceCheck.isBalanced
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {balanceSheetData.balanceCheck.isBalanced
                        ? "Balanced"
                        : "Unbalanced"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Financial position as of {balanceSheetData.asOfDate} with
                    documentation compliance tracking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        {formatCurrency(balanceSheetData.assets.totalAssets)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Assets
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {balanceSheetData.assets.assetsReconciliation.matchedPercentage.toFixed(
                          1
                        )}
                        % documented
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600 mb-2">
                        {formatCurrency(
                          balanceSheetData.liabilities.totalLiabilities
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Liabilities
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {balanceSheetData.liabilities.liabilitiesReconciliation.matchedPercentage.toFixed(
                          1
                        )}
                        % documented
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        {formatCurrency(balanceSheetData.equity.totalEquity)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Equity
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {balanceSheetData.equity.equityReconciliation.matchedPercentage.toFixed(
                          1
                        )}
                        % documented
                      </div>
                    </div>
                  </div>
                  {!balanceSheetData.balanceCheck.isBalanced && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">
                          Balance Check Failed
                        </span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        Assets and Liabilities + Equity don&apos;t balance by{" "}
                        {formatCurrency(
                          Math.abs(balanceSheetData.balanceCheck.difference)
                        )}
                        . This may indicate missing transactions or data issues.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Assets Section */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Assets
                        <span className="text-lg font-bold">
                          {formatCurrency(balanceSheetData.assets.totalAssets)}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        Resources owned by the business
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Current Assets */}
                      <div>
                        <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                          CURRENT ASSETS
                        </h4>
                        <div className="space-y-3">
                          {balanceSheetData.assets.currentAssets.map(
                            (asset, index) => (
                              <div
                                key={index}
                                className="p-3 border rounded-lg space-y-2"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">
                                    {asset.name}
                                  </span>
                                  <span className="font-bold">
                                    {formatCurrency(asset.amount)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    Documentation:{" "}
                                    {asset.reconciliation.matchedPercentage.toFixed(
                                      1
                                    )}
                                    %
                                  </span>
                                  {getReconciliationBadge(
                                    asset.reconciliation.matchedPercentage
                                  )}
                                </div>
                                <Progress
                                  value={asset.reconciliation.matchedPercentage}
                                  className="h-1"
                                />
                              </div>
                            )
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t font-medium">
                          <span>Total Current Assets</span>
                          <span>
                            {formatCurrency(
                              balanceSheetData.assets.totalCurrentAssets
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Non-Current Assets */}
                      {balanceSheetData.assets.nonCurrentAssets.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                            NON-CURRENT ASSETS
                          </h4>
                          <div className="space-y-3">
                            {balanceSheetData.assets.nonCurrentAssets.map(
                              (asset, index) => (
                                <div
                                  key={index}
                                  className="p-3 border rounded-lg space-y-2"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">
                                      {asset.name}
                                    </span>
                                    <span className="font-bold">
                                      {formatCurrency(asset.amount)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      Documentation:{" "}
                                      {asset.reconciliation.matchedPercentage.toFixed(
                                        1
                                      )}
                                      %
                                    </span>
                                    {getReconciliationBadge(
                                      asset.reconciliation.matchedPercentage
                                    )}
                                  </div>
                                  <Progress
                                    value={
                                      asset.reconciliation.matchedPercentage
                                    }
                                    className="h-1"
                                  />
                                </div>
                              )
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t font-medium">
                            <span>Total Non-Current Assets</span>
                            <span>
                              {formatCurrency(
                                balanceSheetData.assets.totalNonCurrentAssets
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Liabilities & Equity Section */}
                <div className="space-y-4">
                  {/* Liabilities */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Liabilities
                        <span className="text-lg font-bold">
                          {formatCurrency(
                            balanceSheetData.liabilities.totalLiabilities
                          )}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        Debts and obligations owed by the business
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Current Liabilities */}
                      <div>
                        <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                          CURRENT LIABILITIES
                        </h4>
                        {balanceSheetData.liabilities.currentLiabilities
                          .length > 0 ? (
                          <div className="space-y-3">
                            {balanceSheetData.liabilities.currentLiabilities.map(
                              (liability, index) => (
                                <div
                                  key={index}
                                  className="p-3 border rounded-lg space-y-2"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">
                                      {liability.name}
                                    </span>
                                    <span className="font-bold">
                                      {formatCurrency(liability.amount)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      Documentation:{" "}
                                      {liability.reconciliation.matchedPercentage.toFixed(
                                        1
                                      )}
                                      %
                                    </span>
                                    {getReconciliationBadge(
                                      liability.reconciliation.matchedPercentage
                                    )}
                                  </div>
                                  <Progress
                                    value={
                                      liability.reconciliation.matchedPercentage
                                    }
                                    className="h-1"
                                  />
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            No current liabilities
                          </p>
                        )}
                        <div className="flex justify-between items-center mt-3 pt-3 border-t font-medium">
                          <span>Total Current Liabilities</span>
                          <span>
                            {formatCurrency(
                              balanceSheetData.liabilities
                                .totalCurrentLiabilities
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Equity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Equity
                        <span className="text-lg font-bold">
                          {formatCurrency(balanceSheetData.equity.totalEquity)}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        Owner&apos;s stake in the business
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {balanceSheetData.equity.equityItems.map(
                          (equity, index) => (
                            <div
                              key={index}
                              className="p-3 border rounded-lg space-y-2"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {equity.name}
                                </span>
                                <span
                                  className={`font-bold ${
                                    equity.amount >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(equity.amount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Documentation:{" "}
                                  {equity.reconciliation.matchedPercentage.toFixed(
                                    1
                                  )}
                                  %
                                </span>
                                {getReconciliationBadge(
                                  equity.reconciliation.matchedPercentage
                                )}
                              </div>
                              <Progress
                                value={equity.reconciliation.matchedPercentage}
                                className="h-1"
                              />
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Overall Documentation Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Documentation Compliance</CardTitle>
                  <CardDescription>
                    Summary of documentation status across all balance sheet
                    items
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Overall Compliance</span>
                      {getReconciliationBadge(
                        balanceSheetData.overallReconciliation.matchedPercentage
                      )}
                    </div>
                    <Progress
                      value={
                        balanceSheetData.overallReconciliation.matchedPercentage
                      }
                      className="h-3"
                    />
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-green-600">
                          {formatCurrency(
                            balanceSheetData.overallReconciliation.matchedAmount
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Documented
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-600">
                          {formatCurrency(
                            balanceSheetData.overallReconciliation
                              .unmatchedAmount
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Missing Docs
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-yellow-600">
                          {formatCurrency(
                            balanceSheetData.overallReconciliation
                              .pendingReviewAmount
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pending Review
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <FileBarChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Generate reports to view Balance Sheet
                  </p>
                  <Button
                    onClick={() => generateReports(true)}
                    className="mt-2"
                    disabled={isGenerating}
                  >
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          {isLoadingLatest ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                  <p className="text-muted-foreground">
                    Loading last generated report...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : expenseData ? (
            <>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const doc = exportExpenseCategoriesReportToPDF(expenseData, {
                      businessName: selectedBusiness?.name || 'Business Report',
                      period: expenseData.period,
                      generatedDate: new Date()
                    });
                    downloadPDF(doc, `expense-categories-${new Date().toISOString().split('T')[0]}.pdf`);
                    toast.success("Expense Categories report exported");
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Expenses to PDF
                </Button>
              </div>
              <Card>
              <CardHeader>
                <CardTitle>Expense Categories Analysis</CardTitle>
                <CardDescription>
                  Detailed breakdown of{" "}
                  {formatCurrency(expenseData.totalExpenses)} in expenses with
                  documentation compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Overall Summary */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Documentation Compliance</h4>
                      {getReconciliationBadge(
                        expenseData.overallReconciliation.matchedPercentage
                      )}
                    </div>
                    <Progress
                      value={
                        expenseData.overallReconciliation.matchedPercentage
                      }
                      className="h-2 mb-2"
                    />
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-green-600">
                          {formatCurrency(
                            expenseData.overallReconciliation.matchedAmount
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Documented
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-600">
                          {formatCurrency(
                            expenseData.overallReconciliation.unmatchedAmount
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Missing Docs
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-yellow-600">
                          {formatCurrency(
                            expenseData.overallReconciliation
                              .pendingReviewAmount
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pending Review
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  {expenseData.categories.map((category, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">
                            {category.category}
                          </span>
                          <span className="font-bold">
                            {formatCurrency(category.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-2 text-xs">
                          <span className="text-muted-foreground">
                            {category.transactionCount} transactions •{" "}
                            {category.percentage.toFixed(1)}% of total
                          </span>
                          {getReconciliationBadge(
                            category.reconciliation.matchedPercentage
                          )}
                        </div>
                        <Progress
                          value={category.reconciliation.matchedPercentage}
                          className="h-1 mb-2"
                        />
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-green-600">
                            ✓{" "}
                            {formatCurrency(
                              category.reconciliation.matchedAmount
                            )}
                          </div>
                          <div className="text-red-600">
                            ⚠{" "}
                            {formatCurrency(
                              category.reconciliation.unmatchedAmount
                            )}
                          </div>
                          <div className="text-yellow-600">
                            ⏳{" "}
                            {formatCurrency(
                              category.reconciliation.pendingReviewAmount
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <PieChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Generate reports to view expense analysis
                  </p>
                  <Button
                    onClick={() => generateReports(true)}
                    className="mt-2"
                    disabled={isGenerating}
                  >
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          {isLoadingLatest ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                  <p className="text-muted-foreground">
                    Loading last generated report...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : cashFlowData ? (
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const doc = exportCashFlowReportToPDF(cashFlowData, {
                      businessName: selectedBusiness?.name || 'Business Report',
                      period: cashFlowData.period,
                      generatedDate: new Date()
                    });
                    downloadPDF(doc, `cash-flow-${new Date().toISOString().split('T')[0]}.pdf`);
                    toast.success("Cash Flow report exported");
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Cash Flow to PDF
                </Button>
              </div>
              {/* Cash Flow Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Statement</CardTitle>
                  <CardDescription>
                    {cashFlowData.period} • Cash movements from operating, investing, and financing activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Beginning Cash</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(cashFlowData.beginningCash)}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Net Change</div>
                      <div className={`text-xl font-bold ${
                        cashFlowData.netCashChange >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {cashFlowData.netCashChange >= 0 ? "+" : ""}
                        {formatCurrency(cashFlowData.netCashChange)}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Ending Cash</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(cashFlowData.endingCash)}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Documentation</div>
                      <div className="text-xl font-bold">
                        {cashFlowData.overallReconciliation.matchedPercentage.toFixed(1)}%
                      </div>
                      {getReconciliationBadge(
                        cashFlowData.overallReconciliation.matchedPercentage
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Operating Activities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Operating Activities
                    <span className={`text-lg font-bold ${
                      cashFlowData.operatingActivities.netCashFromOperating >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {formatCurrency(cashFlowData.operatingActivities.netCashFromOperating)}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Cash flows from primary business operations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cashFlowData.operatingActivities.items.map((item, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{item.description}</span>
                          <span className={`font-bold ${
                            item.amount >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {item.amount >= 0 ? "+" : ""}
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Documentation: {item.reconciliation.matchedPercentage.toFixed(1)}%
                          </span>
                          {getReconciliationBadge(item.reconciliation.matchedPercentage)}
                        </div>
                        <Progress value={item.reconciliation.matchedPercentage} className="h-1 mt-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Investing Activities */}
              {cashFlowData.investingActivities.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Investing Activities
                      <span className={`text-lg font-bold ${
                        cashFlowData.investingActivities.netCashFromInvesting >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {formatCurrency(cashFlowData.investingActivities.netCashFromInvesting)}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Cash flows from investment in assets and securities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {cashFlowData.investingActivities.items.map((item, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{item.description}</span>
                            <span className={`font-bold ${
                              item.amount >= 0 ? "text-green-600" : "text-red-600"
                            }`}>
                              {item.amount >= 0 ? "+" : ""}
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Documentation: {item.reconciliation.matchedPercentage.toFixed(1)}%
                            </span>
                            {getReconciliationBadge(item.reconciliation.matchedPercentage)}
                          </div>
                          <Progress value={item.reconciliation.matchedPercentage} className="h-1 mt-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Financing Activities */}
              {cashFlowData.financingActivities.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Financing Activities
                      <span className={`text-lg font-bold ${
                        cashFlowData.financingActivities.netCashFromFinancing >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {formatCurrency(cashFlowData.financingActivities.netCashFromFinancing)}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Cash flows from loans, equity, and dividends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {cashFlowData.financingActivities.items.map((item, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{item.description}</span>
                            <span className={`font-bold ${
                              item.amount >= 0 ? "text-green-600" : "text-red-600"
                            }`}>
                              {item.amount >= 0 ? "+" : ""}
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Documentation: {item.reconciliation.matchedPercentage.toFixed(1)}%
                            </span>
                            {getReconciliationBadge(item.reconciliation.matchedPercentage)}
                          </div>
                          <Progress value={item.reconciliation.matchedPercentage} className="h-1 mt-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Cash Flow Statement</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track cash inflows and outflows from operating, investing, and
                    financing activities
                  </p>
                  <Button
                    onClick={() => generateReports(true)}
                    className="mt-4"
                    disabled={isGenerating}
                    variant="outline"
                  >
                    Generate Cash Flow Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          {isLoadingLatest ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                  <p className="text-muted-foreground">
                    Loading last generated report...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : reconciliationData ? (
            <div className="space-y-6">
              {/* Risk Assessment Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Compliance Risk Assessment
                    {getRiskBadge(reconciliationData.riskAssessment.riskLevel)}
                  </CardTitle>
                  <CardDescription>
                    Analysis of documentation compliance and potential audit
                    risks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        {reconciliationData.overallSummary.matchedPercentage.toFixed(
                          1
                        )}
                        %
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Documented
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {formatCurrency(
                          reconciliationData.overallSummary.matchedAmount
                        )}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600 mb-2">
                        {(
                          (reconciliationData.overallSummary.unmatchedAmount /
                            reconciliationData.overallSummary.totalAmount) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Missing Docs
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        {formatCurrency(
                          reconciliationData.overallSummary.unmatchedAmount
                        )}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600 mb-2">
                        {reconciliationData.pendingReviewTransactions.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Pending Review
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">
                        {formatCurrency(
                          reconciliationData.overallSummary.pendingReviewAmount
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Unmatched Transactions */}
              {reconciliationData.unmatchedTransactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Unmatched Transactions (
                      {reconciliationData.unmatchedTransactions.length})
                    </CardTitle>
                    <CardDescription>
                      Transactions that need supporting documentation for
                      compliance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reconciliationData.unmatchedTransactions
                        .slice(0, 10)
                        .map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex justify-between items-center p-3 border rounded-lg bg-red-50 border-red-200"
                          >
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium">
                                  {transaction.description || "No description"}
                                </span>
                                <span
                                  className={`font-bold ${
                                    transaction.type === "INCOME"
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(Math.abs(transaction.amount))}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>{formatDate(transaction.date)}</span>
                                <span>
                                  {transaction.category || "Uncategorized"}
                                </span>
                                <span>{transaction.bankAccount}</span>
                                <Badge variant="outline" className="text-xs">
                                  {transaction.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      {reconciliationData.unmatchedTransactions.length > 10 && (
                        <div className="text-center text-sm text-muted-foreground pt-2">
                          And{" "}
                          {reconciliationData.unmatchedTransactions.length - 10}{" "}
                          more unmatched transactions...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pending Review Transactions */}
              {reconciliationData.pendingReviewTransactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      Pending Review (
                      {reconciliationData.pendingReviewTransactions.length})
                    </CardTitle>
                    <CardDescription>
                      Transactions with potential matches that need your
                      confirmation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reconciliationData.pendingReviewTransactions.map(
                        (transaction) => (
                          <div
                            key={transaction.id}
                            className="flex justify-between items-center p-3 border rounded-lg bg-yellow-50 border-yellow-200"
                          >
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium">
                                  {transaction.description || "No description"}
                                </span>
                                <span
                                  className={`font-bold ${
                                    transaction.type === "INCOME"
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(Math.abs(transaction.amount))}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>{formatDate(transaction.date)}</span>
                                <span>
                                  {transaction.category || "Uncategorized"}
                                </span>
                                <span>{transaction.bankAccount}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {transaction.type}
                                  </Badge>
                                  {transaction.confidence && (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                                      {(transaction.confidence * 100).toFixed(
                                        0
                                      )}
                                      % match
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Compliance by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance by Category</CardTitle>
                  <CardDescription>
                    Documentation status breakdown by transaction category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reconciliationData.complianceByCategory.map(
                      (item, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {item.category}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">
                                {formatCurrency(
                                  item.reconciliation.totalAmount
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.reconciliation.matchedCount +
                                  item.reconciliation.unmatchedCount}{" "}
                                transactions
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-2 text-xs">
                            <span className="text-muted-foreground">
                              Documentation:{" "}
                              {item.reconciliation.matchedPercentage.toFixed(1)}
                              %
                            </span>
                            {getReconciliationBadge(
                              item.reconciliation.matchedPercentage
                            )}
                          </div>
                          <Progress
                            value={item.reconciliation.matchedPercentage}
                            className="h-2 mb-2"
                          />
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-green-600 text-center">
                              ✓{" "}
                              {formatCurrency(
                                item.reconciliation.matchedAmount
                              )}
                              <div className="text-muted-foreground">
                                {item.reconciliation.matchedCount} matched
                              </div>
                            </div>
                            <div className="text-red-600 text-center">
                              ⚠{" "}
                              {formatCurrency(
                                item.reconciliation.unmatchedAmount
                              )}
                              <div className="text-muted-foreground">
                                {item.reconciliation.unmatchedCount} unmatched
                              </div>
                            </div>
                            <div className="text-yellow-600 text-center">
                              ⏳{" "}
                              {formatCurrency(
                                item.reconciliation.pendingReviewAmount
                              )}
                              <div className="text-muted-foreground">
                                {item.reconciliation.pendingReviewCount} pending
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Actions</CardTitle>
                  <CardDescription>
                    Steps to improve your documentation compliance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reconciliationData.unmatchedTransactions.length > 0 && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            Upload Missing Receipts
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {reconciliationData.unmatchedTransactions.length}{" "}
                            transactions need supporting documents
                          </div>
                        </div>
                        <Button asChild>
                          <a href="/dashboard/receipts">Upload Receipts</a>
                        </Button>
                      </div>
                    )}
                    {reconciliationData.pendingReviewTransactions.length >
                      0 && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            Review Pending Matches
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {
                              reconciliationData.pendingReviewTransactions
                                .length
                            }{" "}
                            potential matches need confirmation
                          </div>
                        </div>
                        <Button asChild>
                          <a href="/dashboard/reconciliation">Review Matches</a>
                        </Button>
                      </div>
                    )}
                    {reconciliationData.overallSummary.matchedPercentage >=
                      90 && (
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                        <div>
                          <div className="font-medium text-green-800">
                            Excellent Compliance!
                          </div>
                          <div className="text-sm text-green-600">
                            Your documentation is in great shape for tax and
                            audit purposes
                          </div>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Generate reports to view reconciliation analysis
                  </p>
                  <Button
                    onClick={() => generateReports(true)}
                    className="mt-2"
                    disabled={isGenerating}
                  >
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ReportHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
