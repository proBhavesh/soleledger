"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRecurringTransactions } from "@/lib/actions/plaid";
import { formatCurrency } from "@/lib/utils";
import { RepeatIcon, CalendarIcon, LoaderCircle } from "lucide-react";

interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  category: string;
}

export function RecurringTransactions() {
  const [isLoading, setIsLoading] = useState(true);
  const [recurringIncome, setRecurringIncome] = useState<
    RecurringTransaction[]
  >([]);
  const [recurringExpenses, setRecurringExpenses] = useState<
    RecurringTransaction[]
  >([]);

  useEffect(() => {
    const fetchRecurringTransactions = async () => {
      setIsLoading(true);
      try {
        const result = await getRecurringTransactions();

        // Map the database results to our component's expected format
        const formattedIncome = result.recurringIncome.map((income) => ({
          id: income.id,
          description: income.description || "Recurring Income",
          amount: income.amount,
          frequency: extractFrequency(income.notes || ""),
          category: income.category?.name || "Income",
        }));

        const formattedExpenses = result.recurringExpenses.map((expense) => ({
          id: expense.id,
          description: expense.description || "Recurring Expense",
          amount: expense.amount,
          frequency: extractFrequency(expense.notes || ""),
          category: expense.category?.name || "Expense",
        }));

        setRecurringIncome(formattedIncome);
        setRecurringExpenses(formattedExpenses);
      } catch (error) {
        console.error("Error fetching recurring transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecurringTransactions();
  }, []);

  // Helper function to extract frequency from notes field
  const extractFrequency = (notes: string): string => {
    if (notes.includes("Frequency:")) {
      const frequencyPart = notes.split("Frequency:")[1];
      if (frequencyPart.includes(",")) {
        return frequencyPart.split(",")[0].trim();
      }
      return frequencyPart.trim();
    }
    return "Monthly"; // Default fallback
  };

  // Function to get the icon based on frequency
  const getFrequencyIcon = (frequency: string) => {
    switch (frequency.trim().toUpperCase()) {
      case "WEEKLY":
        return <CalendarIcon className="h-4 w-4 text-blue-500" />;
      case "BIWEEKLY":
        return <CalendarIcon className="h-4 w-4 text-green-500" />;
      case "MONTHLY":
        return <CalendarIcon className="h-4 w-4 text-purple-500" />;
      case "ANNUALLY":
        return <CalendarIcon className="h-4 w-4 text-orange-500" />;
      default:
        return <RepeatIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  // Format frequency for display
  const formatFrequency = (frequency: string) => {
    const formattedFrequency = frequency.trim();
    return (
      formattedFrequency.charAt(0).toUpperCase() +
      formattedFrequency.slice(1).toLowerCase()
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recurring Transactions</CardTitle>
          <CardDescription>
            Your subscriptions and recurring payments
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring Transactions</CardTitle>
        <CardDescription>
          Your subscriptions and recurring payments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recurringExpenses.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              No recurring transactions found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect more accounts to track your recurring payments
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">
              Recurring Expenses
            </h3>
            {recurringExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center space-x-3">
                  {getFrequencyIcon(expense.frequency)}
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <span className="mr-2">
                        {formatFrequency(expense.frequency)}
                      </span>
                      <span>•</span>
                      <span className="ml-2">{expense.category}</span>
                    </p>
                  </div>
                </div>
                <div className="font-medium text-red-500">
                  {formatCurrency(expense.amount)}
                </div>
              </div>
            ))}

            {recurringIncome.length > 0 && (
              <>
                <h3 className="text-sm font-medium mt-6 mb-3 text-muted-foreground">
                  Recurring Income
                </h3>
                {recurringIncome.map((income) => (
                  <div
                    key={income.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center space-x-3">
                      {getFrequencyIcon(income.frequency)}
                      <div>
                        <p className="font-medium">{income.description}</p>
                        <p className="text-xs text-muted-foreground flex items-center">
                          <span className="mr-2">
                            {formatFrequency(income.frequency)}
                          </span>
                          <span>•</span>
                          <span className="ml-2">{income.category}</span>
                        </p>
                      </div>
                    </div>
                    <div className="font-medium text-emerald-500">
                      {formatCurrency(income.amount)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
