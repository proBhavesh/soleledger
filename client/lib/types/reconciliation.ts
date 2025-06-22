import { z } from "zod";

// =======================================================
// Reconciliation Types and Schemas
// =======================================================

export const ReconciliationStatusTypeEnum = z.enum([
  "UNMATCHED",
  "MATCHED",
  "PARTIALLY_MATCHED",
  "PENDING_REVIEW",
  "MANUALLY_MATCHED",
  "EXCLUDED",
]);

export const MatchStatusEnum = z.enum([
  "SUGGESTED",
  "CONFIRMED",
  "REJECTED",
  "MANUAL",
]);

// =======================================================
// Validation Schemas
// =======================================================

export const updateReconciliationSchema = z.object({
  transactionId: z.string(),
  documentId: z.string().optional(),
  status: ReconciliationStatusTypeEnum,
  notes: z.string().optional(),
});

export const bulkReconcileSchema = z.object({
  matches: z.array(
    z.object({
      transactionId: z.string(),
      documentId: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
});

export const manualMatchSchema = z.object({
  transactionId: z.string(),
  documentId: z.string(),
  notes: z.string().optional(),
});

// =======================================================
// Type Definitions
// =======================================================

export interface ReconciliationSummary {
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  pendingReview: number;
  matchedPercentage: number;
  totalAmount: number;
  matchedAmount: number;
  unmatchedAmount: number;
}

export interface UnmatchedTransaction {
  id: string;
  date: Date;
  amount: number;
  description: string | null;
  category: string | null;
  bankAccount: string | null;
  reconciliationStatus: string;
  potentialMatches?: Array<{
    documentId: string;
    documentName: string;
    confidence: number;
    extractedVendor: string | null;
    extractedAmount: number | null;
  }>;
}

export interface MatchedTransaction {
  id: string;
  date: Date;
  amount: number;
  description: string | null;
  category: string | null;
  bankAccount: string | null;
  reconciliationStatus: string;
  matchedDocument?: {
    id: string;
    name: string;
    type: string;
    extractedVendor: string | null;
    extractedAmount: number | null;
    extractedDate: Date | null;
  };
  matchedAt?: Date;
  matchedBy?: string;
  isManualMatch?: boolean;
}

export interface AvailableDocument {
  id: string;
  name: string;
  type: string;
  extractedVendor: string | null;
  extractedAmount: number | null;
  extractedDate: Date | null;
  processingStatus: string;
  url: string | null;
  matchScore?: number;
}

export interface DocumentMatch {
  documentId: string;
  documentName: string;
  confidence: number;
  extractedVendor: string | null;
  extractedAmount: number | null;
}

// =======================================================
// Component Props
// =======================================================

export interface ManualMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    date: Date;
    amount: number;
    description: string | null;
    category: string | null;
    bankAccount: string | null;
  };
  onSuccess?: () => void;
}

export interface ReconciliationDashboardProps {
  onViewUnmatched?: () => void;
}

export interface UnmatchedTransactionsProps {
  onBack?: () => void;
}

// =======================================================
// Response Types
// =======================================================

export interface ReconciliationActionResponse {
  success: boolean;
  error?: string;
}

export interface GetUnmatchedTransactionsResponse {
  success: boolean;
  data?: UnmatchedTransaction[];
  total?: number;
  error?: string;
}

export interface GetAvailableDocumentsResponse {
  success: boolean;
  data?: AvailableDocument[];
  error?: string;
}

export interface GetRecentlyMatchedTransactionsResponse {
  success: boolean;
  data?: MatchedTransaction[];
  error?: string;
}

export interface AutoReconcileResponse {
  success: boolean;
  data?: {
    processed: number;
    matched: number;
  };
  error?: string;
}

export interface BulkReconcileResponse {
  success: boolean;
  data?: {
    processed: number;
  };
  error?: string;
}

// =======================================================
// Type Guards
// =======================================================

export function isManuallyMatched(status: string): boolean {
  return status === "MANUALLY_MATCHED";
}

export function isMatched(status: string): boolean {
  return status === "MATCHED" || status === "MANUALLY_MATCHED";
}

export function isUnmatched(status: string): boolean {
  return status === "UNMATCHED" || !status;
}

export function isPendingReview(status: string): boolean {
  return status === "PENDING_REVIEW";
}