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

// Pagination props for Chart of Accounts settings
export interface ChartOfAccountsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}