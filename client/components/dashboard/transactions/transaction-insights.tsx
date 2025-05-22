"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Home,
  ShoppingBag,
  Coffee,
} from "lucide-react";
import { Transaction } from "@/lib/types/dashboard";
import { formatCurrency } from "@/lib/utils";

interface TransactionInsightsProps {
  transactions: Transaction[];
}

export function TransactionInsights({
  transactions,
}: TransactionInsightsProps) {
  // Calculate summary data
  const incomeTotal = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseTotal = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const netTotal = incomeTotal - expenseTotal;

  // Get category icon based on category name
  const getCategoryIcon = (category: string) => {
    const normalizedCategory = category.toLowerCase();

    if (
      normalizedCategory.includes("shopping") ||
      normalizedCategory.includes("merchandise")
    ) {
      return <ShoppingBag className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("food") ||
      normalizedCategory.includes("restaurant")
    ) {
      return <ShoppingBag className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("home") ||
      normalizedCategory.includes("rent")
    ) {
      return <Home className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("coffee") ||
      normalizedCategory.includes("cafe")
    ) {
      return <Coffee className="h-4 w-4" />;
    } else {
      return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Transaction Summary</CardTitle>
          <CardDescription>Current period overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                    <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                  </span>
                  <span className="ml-2">Income</span>
                </div>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(incomeTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                  </span>
                  <span className="ml-2">Expenses</span>
                </div>
                <span className="font-medium text-red-600">
                  {formatCurrency(expenseTotal)}
                </span>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between font-medium">
                <span>Net Income</span>
                <span
                  className={
                    netTotal >= 0 ? "text-emerald-600" : "text-red-600"
                  }
                >
                  {formatCurrency(netTotal)}
                </span>
              </div>
            </div>

            {/* Progress bar visualization */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Income vs Expenses</span>
                <span>
                  {Math.round(
                    (incomeTotal / (incomeTotal + expenseTotal || 1)) * 100
                  ) || 0}
                  %
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${
                      Math.round(
                        (incomeTotal / (incomeTotal + expenseTotal || 1)) * 100
                      ) || 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
          <CardDescription>
            Your biggest income and expense categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Expenses
              </h4>
              <div className="space-y-2">
                {Object.entries(
                  transactions
                    .filter((t) => t.type === "EXPENSE")
                    .reduce((acc, t) => {
                      const cat = t.category || "Uncategorized";
                      acc[cat] = (acc[cat] || 0) + t.amount;
                      return acc;
                    }, {} as Record<string, number>)
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        {getCategoryIcon(category)}
                        <span className="ml-2">{category}</span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Income
              </h4>
              <div className="space-y-2">
                {Object.entries(
                  transactions
                    .filter((t) => t.type === "INCOME")
                    .reduce((acc, t) => {
                      const cat = t.category || "Uncategorized";
                      acc[cat] = (acc[cat] || 0) + t.amount;
                      return acc;
                    }, {} as Record<string, number>)
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        {getCategoryIcon(category)}
                        <span className="ml-2">{category}</span>
                      </div>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
