"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Gets the financial summary for the dashboard
 */
export async function getFinancialSummary(businessId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const userRole = session.user.role;

  let business;

  if (businessId) {
    // Verify user has access to this business
    if (userRole === "BUSINESS_OWNER") {
      // Business owners can only access their own business
      business = await db.business.findFirst({
        where: {
          id: businessId,
          ownerId: userId,
        },
      });
    } else if (userRole === "ACCOUNTANT") {
      // Accountants can access businesses they are members of or own
      business = await db.business.findFirst({
        where: {
          id: businessId,
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
      });
    }
  } else {
    // Default behavior: get user's owned business
    business = await db.business.findFirst({
      where: {
        ownerId: userId,
      },
    });
  }

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
    },
    orderBy: {
      date: "desc",
    },
    take: 20,
    include: {
      category: true,
    },
  });

  // Calculate totals (excluding recurring placeholders)
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME" && !t.reference?.startsWith("recurring-"))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "EXPENSE" && !t.reference?.startsWith("recurring-"))
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
  const recentTransactions = transactions.slice(0, 10).map((t) => ({
    id: t.id,
    description: t.description || "Unnamed Transaction",
    amount: t.amount,
    type: t.type,
    date: t.date,
    category: t.category?.name || "Uncategorized",
    // Add account name from bank accounts
    accountName: accounts.find(a => a.id === t.bankAccountId)?.name || null,
    accountId: t.bankAccountId,
    // Add default values for enriched fields (these would come from Plaid in a real implementation)
    merchantName: null,
    merchantLogo: null,
    originalDescription: t.description,
    locationCity: null,
    locationRegion: null,
    paymentChannel: null,
    pending: false,
    categoryIconName: null,
    categoryConfidence: t.confidence,
    subcategory: null,
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
