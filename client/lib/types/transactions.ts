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
}

// Schema for transaction filters validation
export const transactionFiltersSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  accountId: z.string().optional(),
});

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