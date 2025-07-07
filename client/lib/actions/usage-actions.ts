"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "./business-context-actions";
import { getPlanById } from "@/lib/types/subscription";
import { startOfMonth } from "date-fns";
import type { 
  UsageData, 
  UsageDataResponse,
  UsageHistoryResponse
} from "@/lib/types/usage";

/**
 * Get current usage data for the business
 */
export async function getUsageData(): Promise<UsageDataResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: "No business found" };
    }

    // Get the business
    const business = await db.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return { success: false, error: "Business not found" };
    }

    // Get the subscription
    const subscription = await db.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    // Determine the plan
    const planType = subscription?.plan || "free";
    const plan = getPlanById(planType) || getPlanById("free")!;

    // Get current month usage
    const currentMonth = startOfMonth(new Date());
    const usage = await db.usage.findUnique({
      where: {
        businessId_month: {
          businessId,
          month: currentMonth,
        },
      },
    });

    // Get total bank accounts
    const bankAccountCount = await db.bankAccount.count({
      where: { businessId },
    });

    // Calculate usage percentages
    const transactionUsage = usage?.transactionCount || 0;
    const documentUsage = usage?.documentUploadCount || 0;

    const calculatePercentage = (used: number, limit: number | null) => {
      if (limit === null) return 0; // Unlimited
      if (limit === 0) return 100;
      return Math.min(Math.round((used / limit) * 100), 100);
    };

    const usageData: UsageData = {
      transactions: {
        used: transactionUsage,
        limit: plan.limits.transactions,
        percentage: calculatePercentage(transactionUsage, plan.limits.transactions),
      },
      bankAccounts: {
        used: bankAccountCount,
        limit: plan.limits.bankAccounts,
        percentage: calculatePercentage(bankAccountCount, plan.limits.bankAccounts),
      },
      documentUploads: {
        used: documentUsage,
        limit: plan.limits.documentUploads,
        percentage: calculatePercentage(documentUsage, plan.limits.documentUploads),
      },
      currentPlan: {
        name: plan.name,
        price: plan.price,
      },
    };

    return { success: true, data: usageData };
  } catch (error) {
    console.error("Error getting usage data:", error);
    return { success: false, error: "Failed to get usage data" };
  }
}

/**
 * Get usage history for the business
 */
export async function getUsageHistory(months: number = 6): Promise<UsageHistoryResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: "No business found" };
    }

    // Get usage for the last N months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startMonth = startOfMonth(startDate);

    const usageHistory = await db.usage.findMany({
      where: {
        businessId,
        month: {
          gte: startMonth,
        },
      },
      orderBy: {
        month: "asc",
      },
    });

    return {
      success: true,
      data: usageHistory.map((usage) => ({
        month: usage.month.toISOString(),
        transactions: usage.transactionCount,
        documents: usage.documentUploadCount,
      })),
    };
  } catch (error) {
    console.error("Error getting usage history:", error);
    return { success: false, error: "Failed to get usage history" };
  }
}