"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Gets the financial summary for the dashboard
 */
export async function getFinancialSummary() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // Get active business for the user
  const business = await db.business.findFirst({
    where: {
      ownerId: userId,
    },
  });

  if (!business) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      pendingReceipts: 0,
      totalBalance: 0,
      recentTransactions: [],
      hasConnectedAccounts: false,
      recurringExpenses: [],
      bankAccounts: [], // Added to provide bank account data for refresh
    };
  }

  // Get bank accounts
  const accounts = await db.bankAccount.findMany({
    where: {
      businessId: business.id,
    },
  });

  // Check if has connected accounts
  const hasConnectedAccounts = accounts.length > 0;

  // Calculate total balance
  const totalBalance = accounts.reduce(
    (sum, account) => sum + (account.balance || 0),
    0
  );

  // Get transactions
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await db.transaction.findMany({
    where: {
      businessId: business.id,
      date: {
        gte: thirtyDaysAgo,
      },
      reference: {
        not: {
          startsWith: "recurring-",
        },
      },
    },
    orderBy: {
      date: "desc",
    },
    take: 20,
    include: {
      category: true,
    },
  });

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  // Get pending receipts
  const pendingReceipts = await db.document.count({
    where: {
      businessId: business.id,
      transactionId: null,
      type: "RECEIPT",
    },
  });

  // Get recent transactions for display
  const recentTransactions = transactions.slice(0, 5).map((t) => ({
    id: t.id,
    description: t.description || "Unnamed Transaction",
    amount: t.amount,
    type: t.type,
    date: t.date,
    category: t.category?.name || "Uncategorized",
  }));

  // Get recurring expenses
  const recurringTransactions = await db.transaction.findMany({
    where: {
      businessId: business.id,
      type: "EXPENSE",
      reference: {
        startsWith: "recurring-",
      },
    },
    orderBy: {
      amount: "desc",
    },
    take: 5,
    include: {
      category: true,
    },
  });

  const recurringExpenses = recurringTransactions.map((t) => ({
    id: t.id,
    description: t.description || "Recurring Expense",
    amount: t.amount,
    frequency: t.notes?.includes("Frequency:")
      ? t.notes.split("Frequency:")[1].split(",")[0].trim()
      : "Monthly",
    category: t.category?.name || "Uncategorized",
  }));

  return {
    totalIncome,
    totalExpenses,
    pendingReceipts,
    totalBalance,
    recentTransactions,
    hasConnectedAccounts,
    recurringExpenses,
    bankAccounts: accounts, // Include bank accounts for refresh button
  };
}
