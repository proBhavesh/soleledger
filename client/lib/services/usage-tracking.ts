import { db } from "@/lib/db";
import { startOfMonth } from "date-fns";
import { DEFAULT_FREE_PLAN_LIMITS } from "@/lib/types/usage";
import type { 
  UsageLimits, 
  CurrentUsage, 
  UsageCheckResult
} from "@/lib/types/usage";

/**
 * Get the current user's subscription and usage limits
 */
export async function getUserLimits(userId: string): Promise<UsageLimits | null> {
  const subscription = await db.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    // Default to free plan limits
    return DEFAULT_FREE_PLAN_LIMITS;
  }

  return {
    transactionLimit: subscription.transactionLimit,
    bankAccountLimit: subscription.bankAccountLimit,
    documentUploadLimit: subscription.documentUploadLimit,
  };
}

/**
 * Get or create usage record for the current month
 */
export async function getOrCreateUsageRecord(businessId: string) {
  const currentMonth = startOfMonth(new Date());

  const usage = await db.usage.upsert({
    where: {
      businessId_month: {
        businessId,
        month: currentMonth,
      },
    },
    update: {},
    create: {
      businessId,
      month: currentMonth,
      transactionCount: 0,
      documentUploadCount: 0,
    },
  });

  return usage;
}

/**
 * Get current usage for a business
 */
export async function getCurrentUsage(businessId: string): Promise<CurrentUsage> {
  const usage = await getOrCreateUsageRecord(businessId);
  
  // Get bank account count (not tracked monthly)
  const bankAccountCount = await db.bankAccount.count({
    where: { businessId },
  });

  return {
    transactionCount: usage.transactionCount,
    bankAccountCount,
    documentUploadCount: usage.documentUploadCount,
  };
}

/**
 * Check if a transaction can be created
 */
export async function checkTransactionLimit(
  userId: string,
  businessId: string,
  count: number = 1
): Promise<UsageCheckResult> {
  const limits = await getUserLimits(userId);
  const usage = await getCurrentUsage(businessId);

  if (!limits?.transactionLimit) {
    // Unlimited
    return {
      allowed: true,
      currentUsage: usage.transactionCount,
      limit: null,
      remainingUsage: null,
    };
  }

  const newTotal = usage.transactionCount + count;
  const allowed = newTotal <= limits.transactionLimit;

  return {
    allowed,
    currentUsage: usage.transactionCount,
    limit: limits.transactionLimit,
    remainingUsage: Math.max(0, limits.transactionLimit - usage.transactionCount),
    message: allowed
      ? undefined
      : `You've reached your monthly transaction limit of ${limits.transactionLimit}. Upgrade to add more transactions.`,
  };
}

/**
 * Check if a bank account can be connected
 */
export async function checkBankAccountLimit(
  userId: string,
  businessId: string
): Promise<UsageCheckResult> {
  const limits = await getUserLimits(userId);
  const usage = await getCurrentUsage(businessId);

  if (!limits?.bankAccountLimit) {
    // Unlimited
    return {
      allowed: true,
      currentUsage: usage.bankAccountCount,
      limit: null,
      remainingUsage: null,
    };
  }

  const allowed = usage.bankAccountCount < limits.bankAccountLimit;

  return {
    allowed,
    currentUsage: usage.bankAccountCount,
    limit: limits.bankAccountLimit,
    remainingUsage: Math.max(0, limits.bankAccountLimit - usage.bankAccountCount),
    message: allowed
      ? undefined
      : `You've reached your bank account limit of ${limits.bankAccountLimit}. Upgrade to connect more accounts.`,
  };
}

/**
 * Check if a document can be uploaded
 */
export async function checkDocumentUploadLimit(
  userId: string,
  businessId: string
): Promise<UsageCheckResult> {
  const limits = await getUserLimits(userId);
  const usage = await getCurrentUsage(businessId);

  if (!limits?.documentUploadLimit) {
    // Unlimited
    return {
      allowed: true,
      currentUsage: usage.documentUploadCount,
      limit: null,
      remainingUsage: null,
    };
  }

  const allowed = usage.documentUploadCount < limits.documentUploadLimit;

  return {
    allowed,
    currentUsage: usage.documentUploadCount,
    limit: limits.documentUploadLimit,
    remainingUsage: Math.max(0, limits.documentUploadLimit - usage.documentUploadCount),
    message: allowed
      ? undefined
      : `You've reached your monthly document upload limit of ${limits.documentUploadLimit}. Upgrade to upload more documents.`,
  };
}

/**
 * Increment transaction count
 */
export async function incrementTransactionCount(
  businessId: string,
  count: number = 1
): Promise<void> {
  const usage = await getOrCreateUsageRecord(businessId);
  
  await db.usage.update({
    where: { id: usage.id },
    data: {
      transactionCount: {
        increment: count,
      },
    },
  });
}

/**
 * Increment document upload count
 */
export async function incrementDocumentUploadCount(
  businessId: string,
  count: number = 1
): Promise<void> {
  const usage = await getOrCreateUsageRecord(businessId);
  
  await db.usage.update({
    where: { id: usage.id },
    data: {
      documentUploadCount: {
        increment: count,
      },
    },
  });
}

/**
 * Get usage statistics for display
 */
export async function getUsageStats(userId: string, businessId: string) {
  const limits = await getUserLimits(userId);
  const usage = await getCurrentUsage(businessId);

  return {
    transactions: {
      used: usage.transactionCount,
      limit: limits?.transactionLimit,
      percentage: limits?.transactionLimit
        ? Math.round((usage.transactionCount / limits.transactionLimit) * 100)
        : 0,
    },
    bankAccounts: {
      used: usage.bankAccountCount,
      limit: limits?.bankAccountLimit,
      percentage: limits?.bankAccountLimit
        ? Math.round((usage.bankAccountCount / limits.bankAccountLimit) * 100)
        : 0,
    },
    documents: {
      used: usage.documentUploadCount,
      limit: limits?.documentUploadLimit,
      percentage: limits?.documentUploadLimit
        ? Math.round((usage.documentUploadCount / limits.documentUploadLimit) * 100)
        : 0,
    },
  };
}