/**
 * Type definitions for Plaid action responses
 * Ensures consistent error handling across all Plaid operations
 */

/**
 * Base response type for Plaid actions
 * @template T - The type of data returned on success
 */
export interface PlaidActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Response data for creating a Plaid Link token
 */
export interface CreateLinkTokenData {
  linkToken: string;
  expiration: string;
  businessId: string;
}

/**
 * Centralized error messages for Plaid operations
 * Ensures consistent error messaging across the application
 */
export const PLAID_ERROR_MESSAGES = {
  unauthorized: "You must be logged in to connect bank accounts",
  noBusinessFound: "No business found or access denied",
  linkTokenFailed: "Failed to create Plaid link token. Please try again.",
  exchangeTokenFailed: "Failed to connect bank account. Please try again.",
  accountLimitExceeded: "Bank account limit exceeded for your subscription plan",
  fetchAccountsFailed: "Failed to fetch bank accounts. Please try again.",
  refreshBalanceFailed: "Failed to refresh account balance. Please try again.",
  transactionSyncFailed: "Failed to sync transactions. Please try again.",
  unexpectedError: "An unexpected error occurred. Please try again later.",
} as const;

/** Type for Plaid error message keys */
export type PlaidErrorMessageKey = keyof typeof PLAID_ERROR_MESSAGES;