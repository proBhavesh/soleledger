"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoaderCircle, RefreshCwIcon, TrendingUp, TrendingDown } from "lucide-react";
import { BankAccount } from "@/lib/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyFlow } from "@/lib/actions/plaid/cash-flow";

interface CashFlowChartProps {
  title?: string;
  description?: string;
  bankAccounts: BankAccount[];
  isRefreshing: boolean;
  onRefresh: (bankAccountId: string) => Promise<void>;
  className?: string;
  monthlyData?: MonthlyFlow[];
}

export function CashFlowChart({
  title = "Cash Flow Overview",
  description = "Income vs. Expenses for the last 6 months",
  bankAccounts,
  isRefreshing,
  onRefresh,
  className,
  monthlyData = [],
}: CashFlowChartProps) {
  // Use real data if available, otherwise show empty state
  const chartData = monthlyData.length > 0 ? monthlyData : [];
  
  const maxValue = chartData.length > 0 
    ? Math.max(...chartData.map(d => Math.max(d.income, d.expenses)))
    : 1;

  // Calculate trend
  const currentMonthTotal = chartData.length > 0 ? chartData[chartData.length - 1].income - chartData[chartData.length - 1].expenses : 0;
  const previousMonthTotal = chartData.length > 1 ? chartData[chartData.length - 2].income - chartData[chartData.length - 2].expenses : 0;
  const trendPercentage = previousMonthTotal !== 0 
    ? ((currentMonthTotal - previousMonthTotal) / Math.abs(previousMonthTotal) * 100).toFixed(1)
    : 0;

  return (
    <Card className={`${className} border-0 shadow-lg`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <CardDescription className="text-muted-foreground">{description}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => bankAccounts?.[0]?.id && onRefresh(bankAccounts[0].id)}
          disabled={isRefreshing || !bankAccounts.length}
        >
          {isRefreshing ? (
            <>
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCwIcon className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>No transaction data available yet. Connect a bank account to see your cash flow.</p>
            </div>
          ) : (
            <>
              {/* Chart visualization */}
              <div className="relative h-64">
                <div className="absolute inset-0 flex items-end justify-between gap-2">
                  {chartData.map((data, index) => {
                const incomeHeight = (data.income / maxValue) * 100;
                const expenseHeight = (data.expenses / maxValue) * 100;
                return (
                  <div key={index} className="flex-1 flex items-end gap-1">
                    <div className="relative flex-1 group">
                      <div
                        className="bg-gradient-to-t from-green-500 to-green-400 rounded-t-md transition-all duration-300 hover:from-green-600 hover:to-green-500 cursor-pointer"
                        style={{ height: `${incomeHeight}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {formatCurrency(data.income)}
                        </div>
                      </div>
                    </div>
                    <div className="relative flex-1 group">
                      <div
                        className="bg-gradient-to-t from-red-500 to-red-400 rounded-t-md transition-all duration-300 hover:from-red-600 hover:to-red-500 cursor-pointer"
                        style={{ height: `${expenseHeight}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {formatCurrency(data.expenses)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                  })}
                </div>
                {/* X-axis labels */}
                <div className="absolute -bottom-6 inset-x-0 flex justify-between">
                  {chartData.map((data, index) => (
                <div key={index} className="flex-1 text-center text-xs text-muted-foreground">
                  {data.month}
                </div>
                  ))}
                </div>
              </div>

              {/* Legend and summary */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-br from-green-500 to-green-400 rounded" />
                    <span className="text-sm text-muted-foreground">Income</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-br from-red-500 to-red-400 rounded" />
                    <span className="text-sm text-muted-foreground">Expenses</span>
                  </div>
                </div>
                {currentMonthTotal !== 0 && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      {Number(trendPercentage) >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">
                        {Number(trendPercentage) >= 0 ? "+" : ""}{trendPercentage}%
                      </span>
                    </div>
                    <div className="text-muted-foreground">vs last month</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
