import { z } from "zod";
import { BankAccountType } from "@/generated/prisma";

// Re-export BankAccountType for convenience
export { BankAccountType };

/**
 * Zod schema for BankAccountType validation
 */
export const BankAccountTypeEnum = z.nativeEnum(BankAccountType);

/**
 * User-friendly labels for bank account types
 */
export const BANK_ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  [BankAccountType.CHECKING]: "Checking Account",
  [BankAccountType.SAVINGS]: "Savings Account",
  [BankAccountType.CREDIT_CARD]: "Credit Card",
  [BankAccountType.LINE_OF_CREDIT]: "Line of Credit",
  [BankAccountType.LOAN]: "Loan",
} as const;

/**
 * Schema for creating a manual bank account
 * @property name - The display name of the account
 * @property accountType - The type of bank account
 * @property accountNumber - Optional last 4 digits or account identifier
 * @property institution - Name of the financial institution
 * @property balance - Current account balance
 * @property currency - Account currency (defaults to CAD)
 */
export const createManualBankAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  accountType: BankAccountTypeEnum,
  accountNumber: z.string().optional().nullable(),
  institution: z.string().min(1, "Institution name is required").max(100),
  balance: z.number().finite("Balance must be a valid number"),
  currency: z.string().min(1).max(3).regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code"),
});

/**
 * Schema for updating a manual account's balance
 * @property bankAccountId - The ID of the bank account to update
 * @property balance - The new balance value
 */
export const updateManualBalanceSchema = z.object({
  bankAccountId: z.string().cuid(),
  balance: z.number().finite("Balance must be a valid number"),
});

/**
 * Base response type for bank account actions
 * @template T - The type of data returned on success
 */
export interface BankAccountActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Response type for creating a manual bank account
 */
export interface CreateManualBankAccountData {
  id: string;
  name: string;
  accountType: BankAccountType;
  balance: number;
  institution: string;
}

export type CreateManualBankAccountResponse = BankAccountActionResponse<CreateManualBankAccountData>;

/**
 * Centralized error messages for bank account operations
 * Ensures consistent error messaging across the application
 */
export const BANK_ACCOUNT_ERROR_MESSAGES = {
  unauthorized: "You must be logged in to manage bank accounts",
  noBusinessSelected: "No business selected",
  createFailed: "Failed to create bank account. Please try again.",
  updateFailed: "Failed to update bank account. Please try again.",
  deleteFailed: "Failed to delete bank account. Please try again.",
  fetchFailed: "Failed to fetch bank accounts. Please try again.",
  notFound: "Bank account not found",
  notManual: "This operation is only available for manual bank accounts",
  hasTransactions: "Cannot delete bank account with existing transactions",
  invalidBalance: "Invalid balance amount",
  unexpectedError: "An unexpected error occurred. Please try again later.",
} as const;