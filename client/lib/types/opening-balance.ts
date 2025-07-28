/**
 * Type definitions for opening balance and balance adjustment operations
 * Follows established patterns for action responses and validation
 */

/**
 * Result of balance validation
 */
export interface BalanceValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Parameters for creating an opening balance journal entry
 */
export interface CreateOpeningBalanceParams {
  bankAccountId: string;
  balance: number;
  businessId: string;
  userId: string;
}

/**
 * Parameters for creating a balance adjustment journal entry
 */
export interface CreateBalanceAdjustmentParams {
  bankAccountId: string;
  oldBalance: number;
  newBalance: number;
  businessId: string;
  userId: string;
}

/**
 * Standard response for opening balance operations
 * Follows the established pattern for action responses
 */
export interface OpeningBalanceActionResponse {
  success: boolean;
  error?: string;
}

/**
 * Configuration for balance validation
 */
export interface BalanceValidationConfig {
  maxBalance: number;
  maxDecimalPlaces: number;
  minMeaningfulAmount: number;
}

/**
 * Default balance validation configuration
 */
export const DEFAULT_BALANCE_VALIDATION_CONFIG: BalanceValidationConfig = {
  maxBalance: 999999999999.99, // ~1 trillion
  maxDecimalPlaces: 2,
  minMeaningfulAmount: 0.01,
};

/**
 * Centralized error messages for opening balance operations
 * Ensures consistent error messaging across the application
 */
export const OPENING_BALANCE_ERROR_MESSAGES = {
  // Validation errors
  missingParameters: "Missing required parameters",
  invalidBalance: "Invalid balance amount",
  balanceTooLarge: "Balance amount is too large",
  tooManyDecimals: "Balance cannot have more than 2 decimal places",
  
  // Account errors
  cashAccountNotFound: "Cash and Bank account not found. Please ensure Chart of Accounts is set up.",
  openingBalanceAccountNotFound: "Opening Balance Equity account not found. Please ensure Chart of Accounts is set up.",
  duplicateOpeningBalance: "Opening balance already exists for this bank account",
  
  // Transaction errors
  journalEntriesUnbalanced: "Journal entries do not balance",
  transactionFailed: "Failed to create opening balance journal entry",
  adjustmentFailed: "Failed to create balance adjustment journal entry",
} as const;