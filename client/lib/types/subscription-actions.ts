/**
 * Types for subscription-related actions and responses
 */

export interface SubscriptionActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  redirect?: string;
}

export interface CheckoutSessionResponse {
  success?: boolean;
  error?: string;
  checkoutUrl?: string;
}

export interface UpgradeSubscriptionRequest {
  plan: "free" | "professional" | "business";
}

export interface UpgradeSubscriptionResponse {
  success: boolean;
  error?: string;
  checkoutUrl?: string;
}

export interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: "success" | "failed" | "pending";
  paymentDate: Date | null;
  createdAt: Date;
  planName: string | null;
}

export interface BillingHistoryResponse {
  success: boolean;
  data?: BillingHistoryItem[];
  error?: string;
}

export interface SubscriptionData {
  id: string;
  plan: "free" | "professional" | "business";
  status: "active" | "cancelled" | "past_due" | "trialing";
  nextBillingDate: Date | null;
  amount: number | null;
  currency: string;
  interval: "month" | "year" | null;
  planName: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: Date | null;
  canceledAt: Date | null;
}

export interface SubscriptionDataResponse {
  success: boolean;
  data?: SubscriptionData;
  error?: string;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  error?: string;
}

// Error messages for better UX
export const SUBSCRIPTION_ERROR_MESSAGES = {
  unauthorized: "You must be logged in to perform this action",
  noEmail: "Unable to retrieve your email address. Please update your profile.",
  noSubscription: "No active subscription found",
  alreadySubscribed: "You already have an active subscription",
  invalidPlan: "Invalid subscription plan selected",
  stripeError: "Payment processing error. Please try again.",
  cancelFailed: "Unable to cancel subscription. Please contact support.",
  upgradeFailed: "Unable to process upgrade. Please try again.",
} as const;