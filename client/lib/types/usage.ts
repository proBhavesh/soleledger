/**
 * Types for usage tracking and billing
 */

export interface UsageLimits {
  transactionLimit: number | null;
  bankAccountLimit: number | null;
  documentUploadLimit: number | null;
}

export interface CurrentUsage {
  transactionCount: number;
  bankAccountCount: number;
  documentUploadCount: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number | null;
  remainingUsage: number | null;
  message?: string;
}

export interface UsageData {
  transactions: UsageMetric;
  bankAccounts: UsageMetric;
  documentUploads: UsageMetric;
  currentPlan: {
    name: string;
    price: number;
  };
}

export interface UsageMetric {
  used: number;
  limit: number | null;
  percentage: number;
}

export interface UsageHistoryItem {
  month: string;
  transactions: number;
  documents: number;
}

export interface UsageHistoryResponse {
  success: boolean;
  data?: UsageHistoryItem[];
  error?: string;
}

export interface UsageDataResponse {
  success: boolean;
  data?: UsageData;
  error?: string;
}

// Default limits for plans when subscription doesn't exist
export const DEFAULT_FREE_PLAN_LIMITS: UsageLimits = {
  transactionLimit: 100,
  bankAccountLimit: 1,
  documentUploadLimit: 10,
} as const;

// Usage limit messages
export const USAGE_LIMIT_MESSAGES = {
  transactions: {
    nearLimit: "You're approaching your transaction limit",
    atLimit: "You've reached your monthly transaction limit",
    upgrade: "Upgrade your plan to add more transactions",
  },
  bankAccounts: {
    nearLimit: "You're close to your bank account limit",
    atLimit: "You've reached your bank account limit",
    upgrade: "Upgrade your plan to connect more bank accounts",
  },
  documentUploads: {
    nearLimit: "You're approaching your document upload limit",
    atLimit: "You've reached your monthly document upload limit",
    upgrade: "Upgrade your plan to upload more documents",
  },
} as const;