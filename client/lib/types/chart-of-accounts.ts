import { z } from "zod";

/**
 * Types for Chart of Accounts functionality
 */

// Account type enum
export const AccountTypeEnum = z.enum([
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
]);

export type AccountType = z.infer<typeof AccountTypeEnum>;

// Account code ranges for validation
export interface AccountCodeRange {
  min: number;
  max: number;
}

export type AccountRangeKey = 
  | "ASSETS"
  | "LIABILITIES"
  | "EQUITY"
  | "INCOME"
  | "COST_OF_SALES"
  | "OPERATING_EXPENSES"
  | "TAX_EXPENSES";

// Chart of Accounts progress dialog props
export interface ChartOfAccountsProgressDialogProps {
  open: boolean;
  onComplete?: () => void;
}

// Chart of Accounts setup component props
export interface ChartOfAccountsSetupProps {
  businessId: string;
  onComplete?: () => void;
  showAsCard?: boolean;
}

// Result type for Chart of Accounts operations
export interface ChartOfAccountsResult {
  success: boolean;
  error?: string;
  message?: string;
}

// Account creation schema
export const createAccountSchema = z.object({
  accountCode: z.string().min(3, "Account code must be at least 3 characters"),
  name: z.string().min(1, "Account name is required"),
  accountType: AccountTypeEnum,
  description: z.string().optional(),
  parentId: z.string().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

// Account update schema
export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// Bank account Chart of Accounts entry schema
export const createBankAccountChartEntrySchema = z.object({
  id: z.string().min(1, "Bank account ID is required"),
  businessId: z.string().min(1, "Business ID is required"),
  name: z.string().min(1, "Bank account name is required"),
  accountType: z.string().min(1, "Account type is required"),
  institution: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
});

export type CreateBankAccountChartEntryInput = z.infer<typeof createBankAccountChartEntrySchema>;

// Pagination props for Chart of Accounts settings
export interface ChartOfAccountsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Parameters for creating a bank account Chart of Accounts entry
 * Used when linking bank accounts to specific GL accounts
 */
export interface CreateBankAccountChartEntryParams {
  id: string;
  businessId: string;
  name: string;
  accountType: string;
  institution?: string | null;
  accountNumber?: string | null;
}

/**
 * Response type for bank account chart entry creation
 * Follows established action response pattern
 */
export interface CreateBankAccountChartEntryResponse {
  success: boolean;
  error?: string;
  chartAccount?: {
    id: string;
    accountCode: string;
    name: string;
    accountType: AccountType;
  };
  message?: string;
}

/**
 * Account code range configuration for automatic code generation
 */
export interface AccountCodeRangeConfig {
  start: string;
  end: string;
  description: string;
}

/**
 * Predefined account code ranges for different account types
 * Used for automatic account code generation
 */
export const BANK_ACCOUNT_CODE_RANGES: Record<string, AccountCodeRangeConfig> = {
  BANK_ACCOUNTS: {
    start: "1201",
    end: "1299",
    description: "Bank accounts range",
  },
  CREDIT_CARDS: {
    start: "2101",
    end: "2199",
    description: "Credit card accounts range",
  },
} as const;

/**
 * Error messages for Chart of Accounts operations
 * Centralized for consistency across the application
 */
export const CHART_OF_ACCOUNTS_ERROR_MESSAGES = {
  // General errors
  unauthorized: "Unauthorized",
  noBusinessFound: "No business found",
  accountNotFound: "Account not found",
  
  // Account code errors
  accountCodeExists: "Account code already exists",
  noAvailableAccountCodes: (type: string) => `No available account codes in the ${type} range`,
  invalidAccountData: "Invalid account data",
  
  // Creation errors
  createFailed: "Failed to create account",
  updateFailed: "Failed to update account",
  deactivateFailed: "Failed to deactivate account",
  
  // Bank account specific
  bankAccountChartEntryFailed: "Failed to create Chart of Accounts entry for bank account",
  
  // Import errors
  importFailed: "Failed to import Chart of Accounts",
} as const;