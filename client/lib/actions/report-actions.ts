"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Validation schemas
const reportRequestSchema = z.object({
  type: z.enum(["PROFIT_LOSS", "EXPENSE_CATEGORIES", "CASH_FLOW"]),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  period: z.enum(["custom", "month", "quarter", "year"]).optional(),
});

export interface ReportRequest {
  type: "PROFIT_LOSS" | "EXPENSE_CATEGORIES" | "CASH_FLOW";
  startDate: string;
  endDate: string;
  period?: "custom" | "month" | "quarter" | "year";
}

export interface ProfitLossData {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  incomeByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface ExpenseCategoriesData {
  period: string;
  totalExpenses: number;
  categories: Array<{
    category: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
}

/**
 * Generate Profit & Loss Report
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

    // Get transactions for the period
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
      },
    });

    // Calculate income and expenses
    const incomeTransactions = transactions.filter((t) => t.type === "INCOME");
    const expenseTransactions = transactions.filter(
      (t) => t.type === "EXPENSE"
    );

    const totalIncome = incomeTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const totalExpenses = expenseTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const netIncome = totalIncome - totalExpenses;

    // Group by category
    const incomeByCategory = groupByCategory(incomeTransactions, totalIncome);
    const expensesByCategory = groupByCategory(
      expenseTransactions,
      totalExpenses
    );

    const period = `${validatedData.startDate.toLocaleDateString()} - ${validatedData.endDate.toLocaleDateString()}`;

    const reportData: ProfitLossData = {
      period,
      totalIncome,
      totalExpenses,
      netIncome,
      incomeByCategory,
      expensesByCategory,
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
 * Generate Expense Categories Report
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

    // Get expense transactions for the period
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
      },
    });

    const totalExpenses = transactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );

    // Group by category with additional stats
    const categoryMap = new Map<
      string,
      {
        amount: number;
        count: number;
      }
    >();

    transactions.forEach((transaction) => {
      const categoryName = transaction.category?.name || "Uncategorized";
      const existing = categoryMap.get(categoryName) || { amount: 0, count: 0 };
      existing.amount += Math.abs(transaction.amount);
      existing.count += 1;
      categoryMap.set(categoryName, existing);
    });

    const categories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const period = `${validatedData.startDate.toLocaleDateString()} - ${validatedData.endDate.toLocaleDateString()}`;

    const reportData: ExpenseCategoriesData = {
      period,
      totalExpenses,
      categories,
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

// Helper functions
function groupByCategory(
  transactions: Array<{
    category?: { name: string } | null;
    amount: number;
  }>,
  totalAmount: number
) {
  const categoryMap = new Map<string, number>();

  transactions.forEach((transaction) => {
    const categoryName = transaction.category?.name || "Uncategorized";
    const existing = categoryMap.get(categoryName) || 0;
    categoryMap.set(categoryName, existing + Math.abs(transaction.amount));
  });

  return Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
