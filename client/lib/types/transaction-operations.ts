/**
 * Types for transaction operations and components
 */

import { z } from "zod";
import type { Transaction } from "./dashboard";

// =======================================================
// Zod Schemas for Validation
// =======================================================

export const updateTransactionSchema = z.object({
  transactionId: z.string(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  date: z.date().optional(),
  notes: z.string().optional(),
});

export const updateCategorySchema = z.object({
  transactionId: z.string(),
  categoryId: z.string(),
});

export const updateReconciliationSchema = z.object({
  transactionId: z.string(),
  isReconciled: z.boolean(),
});

export const editTransactionFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  date: z.date(),
  notes: z.string().optional(),
});

// =======================================================
// Type Definitions
// =======================================================

export type UpdateTransactionData = z.infer<typeof updateTransactionSchema>;
export type UpdateCategoryData = z.infer<typeof updateCategorySchema>;
export type UpdateReconciliationData = z.infer<typeof updateReconciliationSchema>;
export type EditTransactionFormData = z.infer<typeof editTransactionFormSchema>;

// =======================================================
// Response Types for Server Actions
// =======================================================

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export type UpdateTransactionResponse = ActionResponse<Transaction>;
export type DeleteTransactionResponse = ActionResponse<{ message: string }>;
export type UpdateTransactionCategoryResponse = ActionResponse<Transaction>;
export type ToggleTransactionReconciliationResponse = ActionResponse<Transaction>;
export type GetBusinessCategoriesResponse = ActionResponse<{ categories: import("@/generated/prisma").Category[] }>;

// =======================================================
// Component Props Types
// =======================================================

export interface TransactionDropdownMenuProps {
  transaction: Transaction;
  onEdit: () => void;
  onCategorize: () => void;
  onReconcile: () => void;
  onDelete: () => void;
}

export interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export interface CategorizeTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  itemName?: string;
}

// =======================================================
// Utility Types
// =======================================================

export interface TransactionFilters {
  search?: string;
  category?: string;
  accountId?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  type?: "INCOME" | "EXPENSE";
  minAmount?: number;
  maxAmount?: number;
  reconciled?: boolean;
}

export interface TransactionSortOptions {
  field: "date" | "amount" | "description" | "category";
  direction: "asc" | "desc";
}

// =======================================================
// Error Types
// =======================================================

export interface TransactionError {
  code: "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION_ERROR" | "PERMISSION_DENIED" | "NETWORK_ERROR" | "UNKNOWN";
  message: string;
  details?: unknown;
}

export class TransactionOperationError extends Error {
  constructor(
    public code: TransactionError["code"],
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "TransactionOperationError";
  }
}