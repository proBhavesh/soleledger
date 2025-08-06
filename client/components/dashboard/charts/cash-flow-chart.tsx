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
  // Use real data if available
  const chartData = monthlyData || [];
  
  // Ensure we have a minimum height for the chart even with zero values
  const maxValue = chartData.length > 0 
    ? Math.max(...chartData.map(d => Math.max(d.income, d.expenses)), 100) // Minimum of 100 for scale
    : 100;

  // Check if we have actual transaction data (not just empty months)
  const hasTransactionData = chartData.some(d => d.income > 0 || d.expenses > 0);
  
  // Calculate trend
  const currentMonthTotal = chartData.length > 0 ? chartData[chartData.length - 1].income - chartData[chartData.length - 1].expenses : 0;
  const previousMonthTotal = chartData.length > 1 ? chartData[chartData.length - 2].income - chartData[chartData.length - 2].expenses : 0;
  const trendPercentage = previousMonthTotal !== 0 
    ? ((currentMonthTotal - previousMonthTotal) / Math.abs(previousMonthTotal) * 100).toFixed(1)
    : 0;

  return (
    <Card className={`${className} border border-border/50 shadow-xl bg-gradient-to-br from-background to-muted/20`}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            {title}
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">{description}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 hover:bg-muted/50 transition-all duration-200 border-border/50"
          onClick={() => bankAccounts?.[0]?.id && onRefresh(bankAccounts[0].id)}
          disabled={isRefreshing || !bankAccounts.length}
        >
          {isRefreshing ? (
            <>
              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs font-medium">Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCwIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Refresh</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {!chartData || chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-rose-100 dark:from-emerald-900/20 dark:to-rose-900/20 rounded-full flex items-center justify-center mx-auto">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No cash flow data available</p>
                <p className="text-sm text-muted-foreground/70">Transactions will appear here once processed</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chart visualization */}
              <div className="relative h-64 p-4 bg-gradient-to-b from-muted/5 to-muted/20 rounded-lg">
                {/* Show overlay message if no transaction data */}
                {!hasTransactionData && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-gradient-to-br from-background/80 to-muted/60 backdrop-blur-sm rounded-lg">
                    <div className="text-center space-y-2 px-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-rose-100 dark:from-emerald-900/20 dark:to-rose-900/20 rounded-full flex items-center justify-center mx-auto">
                        <TrendingUp className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium text-sm">
                        No transactions yet
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Your cash flow will appear here once you have income or expenses
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-end justify-between gap-3 h-full px-2">
                  {chartData.map((data, index) => {
                    // Calculate heights with minimum visibility
                    const incomeHeight = data.income > 0 
                      ? Math.max((data.income / maxValue) * 100, 2) // Minimum 2% height for visibility
                      : 0;
                    const expenseHeight = data.expenses > 0 
                      ? Math.max((data.expenses / maxValue) * 100, 2) // Minimum 2% height for visibility
                      : 0;
                    
                    return (
                      <div key={index} className="flex-1 flex items-end gap-1.5 h-full max-w-[120px]">
                        <div className="relative flex-1 flex items-end h-full group">
                          <div
                            className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-md transition-all duration-300 hover:from-emerald-600 hover:to-teal-500 cursor-pointer shadow-sm hover:shadow-lg hover:scale-105"
                            style={{ 
                              height: `${incomeHeight}%`,
                              minHeight: data.income > 0 ? '4px' : '0'
                            }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg">
                              {formatCurrency(data.income)}
                            </div>
                          </div>
                        </div>
                        <div className="relative flex-1 flex items-end h-full group">
                          <div
                            className="w-full bg-gradient-to-t from-rose-500 to-pink-400 rounded-md transition-all duration-300 hover:from-rose-600 hover:to-pink-500 cursor-pointer shadow-sm hover:shadow-lg hover:scale-105"
                            style={{ 
                              height: `${expenseHeight}%`,
                              minHeight: data.expenses > 0 ? '4px' : '0'
                            }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg">
                              {formatCurrency(data.expenses)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* X-axis labels */}
                <div className="absolute -bottom-2 inset-x-4 flex justify-between">
                  {chartData.map((data, index) => (
                    <div key={index} className="flex-1 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {data.month}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend and summary */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/50">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-br from-emerald-500 to-teal-400 rounded shadow-sm" />
                    <span className="text-sm text-muted-foreground font-medium">Income</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-br from-rose-500 to-pink-400 rounded shadow-sm" />
                    <span className="text-sm text-muted-foreground font-medium">Expenses</span>
                  </div>
                </div>
                {currentMonthTotal !== 0 && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      {Number(trendPercentage) >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                      )}
                      <span className="font-semibold">
                        {Number(trendPercentage) >= 0 ? "+" : ""}{trendPercentage}%
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs uppercase tracking-wide">vs last month</div>
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
