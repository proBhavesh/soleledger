"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export interface MonthlyFlow {
  month: string;
  income: number;
  expenses: number;
}

/**
 * Gets monthly cash flow data for the last 6 months
 */
export async function getMonthlyCashFlow(businessId?: string): Promise<MonthlyFlow[]> {
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
    // Return empty data for 6 months so the chart still shows structure
    const emptyData: MonthlyFlow[] = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(currentDate, i);
      emptyData.push({
        month: format(monthDate, "MMM"),
        income: 0,
        expenses: 0,
      });
    }
    return emptyData;
  }

  // Get data for the last 6 months
  const monthlyData: MonthlyFlow[] = [];
  const currentDate = new Date();

  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(currentDate, i);
    const startDate = startOfMonth(monthDate);
    const endDate = endOfMonth(monthDate);

    // Get transactions for this month
    const transactions = await db.transaction.findMany({
      where: {
        businessId: business.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
        // Exclude system transactions
        NOT: {
          description: {
            in: ["Opening Balance", "Balance Adjustment"],
          },
        },
      },
    });

    // Calculate totals
    // Income transactions are positive amounts
    const income = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Expense transactions might be stored as negative, convert to positive for display
    const expenses = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    monthlyData.push({
      month: format(monthDate, "MMM"),
      income,
      expenses,
    });
  }

  return monthlyData;
}