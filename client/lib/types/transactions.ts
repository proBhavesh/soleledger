import { z } from "zod";
import { TransactionFilterValues, Transaction } from "./dashboard";

// Re-export Transaction from dashboard types
export type { Transaction } from "./dashboard";

// =======================================================
// Transaction Page Types
// =======================================================

export interface TransactionsPageProps {
  initialTransactions: Transaction[];
  totalTransactions: number;
  currentPage: number;
  pageSize: number;
  searchParams: Record<string, string | undefined>;
  error: string | null;
  bankAccounts: Array<{
    id: string;
    name: string;
    institution?: string | null;
    balance?: number | null;
  }>;
  businessId: string | null;
}

export interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    category?: string;
    search?: string;
    from?: string;
    to?: string;
    accountId?: string;
    type?: string;
    min?: string;
    max?: string;
  }>;
}

// =======================================================
// Filter Types
// =======================================================

export interface TransactionFilters {
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  type?: string;
  minAmount?: string;
  maxAmount?: string;
}

// Schema for transaction filters validation
export const transactionFiltersSchema = z.object({
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  accountId: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "ALL"]).optional(),
  minAmount: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid amount format").optional(),
  maxAmount: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid amount format").optional(),
}).refine(
  (data) => {
    // Validate date range
    if (data.dateFrom && data.dateTo) {
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    }
    return true;
  },
  { message: "Start date must be before end date", path: ["dateFrom"] }
).refine(
  (data) => {
    // Validate amount range
    if (data.minAmount && data.maxAmount) {
      return parseFloat(data.minAmount) <= parseFloat(data.maxAmount);
    }
    return true;
  },
  { message: "Minimum amount must be less than maximum amount", path: ["minAmount"] }
);

// =======================================================
// Response Types
// =======================================================

export interface GetEnrichedTransactionsResponse {
  success: boolean;
  transactions?: Transaction[];
  total?: number;
  error?: string;
}

export interface GetTransactionDetailsResponse {
  success: boolean;
  transaction?: Transaction;
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    url: string | null;
  }>;
  error?: string;
}

// =======================================================
// Component Types
// =======================================================

// Transaction type enum for filtering
export type TransactionType = "INCOME" | "EXPENSE" | "ALL";

// Props for TransactionFilters component
export interface TransactionFiltersProps {
  categories: string[];
  accounts: { id: string; name: string }[];
  onFiltersChange: (filters: TransactionFilterValues) => void;
  className?: string;
}

// Props for Pagination component
export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

// Props for TransactionList component
export interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  onRefresh?: () => void;
}