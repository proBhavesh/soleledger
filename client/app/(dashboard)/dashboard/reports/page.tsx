"use client";

import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  generateProfitLossReport,
  generateExpenseCategoriesReport,
  type ProfitLossData,
  type ExpenseCategoriesData,
} from "@/lib/actions/report-actions";
import {
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [isGenerating, setIsGenerating] = useState(false);
  const [profitLossData, setProfitLossData] = useState<ProfitLossData | null>(
    null
  );
  const [expenseData, setExpenseData] = useState<ExpenseCategoriesData | null>(
    null
  );

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

  const generateReports = async () => {
    try {
      setIsGenerating(true);
      const { start, end } = getPeriodDates(selectedPeriod);

      // Generate P&L Report
      const plResult = await generateProfitLossReport({
        type: "PROFIT_LOSS" as const,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        period: selectedPeriod as "month" | "quarter" | "year" | "custom",
      });

      if (plResult.success && plResult.data) {
        setProfitLossData(plResult.data);
      }

      // Generate Expense Categories Report
      const expenseResult = await generateExpenseCategoriesReport({
        type: "EXPENSE_CATEGORIES" as const,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        period: selectedPeriod as "month" | "quarter" | "year" | "custom",
      });

      if (expenseResult.success && expenseResult.data) {
        setExpenseData(expenseResult.data);
      }

      toast.success("Reports generated successfully");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            Generate comprehensive financial reports and insights for your
            business
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
          <Button onClick={generateReports} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileBarChart className="h-4 w-4 mr-2" />
            )}
            Generate Reports
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {profitLossData && (
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
                Profit Margin
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profitLossData.totalIncome > 0
                  ? (
                      (profitLossData.netIncome / profitLossData.totalIncome) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </div>
              <p className="text-xs text-muted-foreground">Net margin</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="profit-loss" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="expenses">Expense Categories</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="profit-loss" className="space-y-4">
          {profitLossData ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Income by Category</CardTitle>
                  <CardDescription>Breakdown of income sources</CardDescription>
                </CardHeader>
                <CardContent>
                  {profitLossData.incomeByCategory.length > 0 ? (
                    <div className="space-y-3">
                      {profitLossData.incomeByCategory
                        .slice(0, 5)
                        .map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">{item.category}</span>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(item.amount)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.percentage.toFixed(1)}%
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
                    Breakdown of business expenses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profitLossData.expensesByCategory.length > 0 ? (
                    <div className="space-y-3">
                      {profitLossData.expensesByCategory
                        .slice(0, 5)
                        .map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">{item.category}</span>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(item.amount)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.percentage.toFixed(1)}%
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
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <FileBarChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Generate reports to view P&L data
                  </p>
                  <Button
                    onClick={generateReports}
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
          {expenseData ? (
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories Analysis</CardTitle>
                <CardDescription>
                  Detailed breakdown of{" "}
                  {formatCurrency(expenseData.totalExpenses)} in expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenseData.categories.map((category, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {category.category}
                          </span>
                          <span className="font-bold">
                            {formatCurrency(category.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-muted-foreground">
                            {category.transactionCount} transactions
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {category.percentage.toFixed(1)}% of total
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <PieChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Generate reports to view expense analysis
                  </p>
                  <Button
                    onClick={generateReports}
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
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Cash flow reporting coming soon
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Track money in and out of your business over time
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Reconciliation reporting available
                </p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  View your reconciliation status and progress
                </p>
                <Button asChild>
                  <a href="/dashboard/reconciliation">
                    View Reconciliation Dashboard
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
