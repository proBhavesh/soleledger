"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart } from "lucide-react";
import { Transaction } from "@/lib/types/dashboard";

interface IncomeExpenseChartProps {
  totalIncome: number;
  totalExpenses: number;
  periodLabel?: string;
  recentTransactions: Array<
    Pick<
      Transaction,
      "id" | "description" | "amount" | "type" | "date" | "category"
    >
  >;
  isLoading?: boolean;
  className?: string;
}

// Define a type for chart data
interface SummaryDataItem {
  name: string;
  value: number;
  fill: string;
}

// Define a type for daily data
interface DailyDataItem {
  date: string;
  income: number;
  expenses: number;
}

// Define a custom tooltip props interface based on Recharts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: SummaryDataItem;
  }>;
}

export function IncomeExpenseChart({
  totalIncome,
  totalExpenses,
  periodLabel = "Last 30 Days",
  recentTransactions,
  isLoading = false,
  className,
}: IncomeExpenseChartProps) {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  // Group transactions by date for the bar chart
  const dailyData = getDailyData(recentTransactions);

  // Prepare data for the charts
  const summaryData: SummaryDataItem[] = [
    {
      name: "Income",
      value: totalIncome,
      fill: "hsl(var(--success))",
    },
    {
      name: "Expenses",
      value: totalExpenses,
      fill: "hsl(var(--destructive))",
    },
  ];

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-2 text-sm">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-primary">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Income vs. Expenses</CardTitle>
          <CardDescription>{periodLabel}</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={chartType === "bar" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setChartType("bar")}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === "pie" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setChartType("pie")}
          >
            <PieChart className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="w-full h-[300px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart
                  data={dailyData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis
                    tickFormatter={(value) =>
                      formatCurrency(value, undefined, { notation: "compact" })
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="hsl(var(--success))"
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="hsl(var(--destructive))"
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={summaryData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {summaryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to group transactions by date
function getDailyData(
  transactions: IncomeExpenseChartProps["recentTransactions"]
): DailyDataItem[] {
  // Create a map to store income and expenses by date
  const dailyMap = new Map<
    string,
    { date: string; income: number; expenses: number }
  >();

  // Get the last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Initialize the map with all days in the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    dailyMap.set(dateStr, { date: dateStr, income: 0, expenses: 0 });
  }

  // Aggregate transactions by date
  transactions.forEach((transaction) => {
    const txDate = new Date(transaction.date);
    // Only include transactions from the last 30 days
    if (txDate >= thirtyDaysAgo && txDate <= today) {
      const dateStr = txDate.toISOString().split("T")[0];
      const current = dailyMap.get(dateStr) || {
        date: dateStr,
        income: 0,
        expenses: 0,
      };

      if (transaction.type === "INCOME") {
        current.income += Math.abs(transaction.amount);
      } else if (transaction.type === "EXPENSE") {
        current.expenses += Math.abs(transaction.amount);
      }

      dailyMap.set(dateStr, current);
    }
  });

  // Convert map to array and sort by date
  return Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}
