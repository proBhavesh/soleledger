"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getRecurringTransactions } from "@/lib/actions/plaid";
import {
  LoaderCircle,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RecurringExpense } from "@/lib/types/dashboard";
import { toast } from "sonner";

export function RecurringTransactions() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recurringExpenses, setRecurringExpenses] = useState<
    RecurringExpense[]
  >([]);

  // Fetch recurring transactions
  const fetchRecurringTransactions = async () => {
    try {
      setIsLoading(true);
      const result = await getRecurringTransactions();

      if (result.success && result.recurringExpenses) {
        setRecurringExpenses(result.recurringExpenses);
      } else {
        toast.error(result.error || "Failed to load recurring transactions");
        setRecurringExpenses([]);
      }
    } catch (error) {
      console.error("Error fetching recurring transactions:", error);
      toast.error("Failed to load recurring transactions");
      setRecurringExpenses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh recurring transactions
  const refreshRecurringTransactions = async () => {
    try {
      setIsRefreshing(true);
      await fetchRecurringTransactions();
      toast.success("Recurring transactions refreshed");
    } catch (error) {
      console.error("Error refreshing recurring transactions:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load recurring transactions on mount
  useEffect(() => {
    fetchRecurringTransactions();
  }, []);

  // Calculate monthly total
  const monthlyTotal = recurringExpenses
    .filter((expense) => expense.flow === "OUTFLOW")
    .reduce((sum, expense) => sum + expense.amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recurring Subscriptions</CardTitle>
          <CardDescription>
            Your recurring payments and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <div className="flex flex-col items-center gap-2">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading subscriptions...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recurringExpenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recurring Subscriptions</CardTitle>
          <CardDescription>
            Your recurring payments and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground">
            No recurring subscriptions found in your transactions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recurring Subscriptions</CardTitle>
          <CardDescription>
            Your recurring payments and subscriptions
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Monthly total</p>
            <p className="text-xl font-bold">{formatCurrency(monthlyTotal)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshRecurringTransactions}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurringExpenses
              .sort((a, b) => b.amount - a.amount)
              .map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {expense.flow === "INFLOW" ? (
                        <ArrowUpRight className="mr-2 h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="mr-2 h-4 w-4 text-red-500" />
                      )}
                      <span>{expense.merchantName || expense.description}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last charge: {formatDate(expense.lastDate)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.category}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {expense.frequency.toLowerCase()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {expense.nextDate ? (
                      formatDate(expense.nextDate)
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        expense.flow === "INFLOW"
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {expense.flow === "INFLOW" ? "+" : "-"}
                      {formatCurrency(expense.amount)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {expense.status === "ACTIVE" ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200"
                        >
                          Inactive
                        </Badge>
                      )}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
