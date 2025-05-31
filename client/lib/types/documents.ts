// Document processing types for Phase 4 implementation
import type {
  DocumentMatch as PrismaDocumentMatch,
  DocumentType,
} from "@/generated/prisma";

export interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  fileUrl: string;
}

export interface ProcessDocumentRequest {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface ExtractedReceiptData {
  type: "receipt" | "invoice" | "statement" | "other";
  vendor?: string;
  amount?: number;
  currency: string;
  date?: string; // ISO date string
  tax?: number;
  items?: Array<{
    description: string;
    amount?: number;
    quantity?: number;
  }>;
  confidence: number;
  notes?: string;
}

// JSON-compatible type for Prisma storage
export type ExtractedReceiptDataJson = Record<string, unknown>;

// Type conversion utilities for Prisma JSON fields
export function toExtractedDataJson(
  data: ExtractedReceiptData
): ExtractedReceiptDataJson {
  // Convert to plain object that Prisma can store as JSON
  return JSON.parse(JSON.stringify(data));
}

export interface DocumentMatch {
  id: string;
  documentId: string;
  transactionId: string;
  confidence: number;
  status: "SUGGESTED" | "CONFIRMED" | "REJECTED" | "MANUAL";
  matchReason: string;
  isUserConfirmed: boolean;
  createdAt: Date;
}

export interface ProcessedDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  mimeType: string | null;
  processingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  extractedData: ExtractedReceiptData | null;
  extractedAmount: number | null;
  extractedDate: Date | null;
  extractedVendor: string | null;
  extractedTax: number | null;
  extractedCurrency: string | null;
  matches: DocumentMatch[];
  createdAt: Date;
}

export interface RecentDocument {
  id: string;
  name: string;
  type: string;
  processingStatus: string;
  extractedVendor?: string;
  extractedAmount?: number;
  url: string;
  createdAt: string;
  matches: Array<{ confidence: number; status: string }>;
}

// Action result types
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export type UploadResult = ActionResult<PresignedUrlResponse>;
export type ProcessResult = ActionResult<{
  document: ProcessedDocument;
  extractedData: ExtractedReceiptData;
  matches: DocumentMatch[];
}>;
export type RecentDocumentsResult = ActionResult<{
  documents: RecentDocument[];
}>;

// Type conversion utilities
export function toDocumentType(type: string): DocumentType {
  const upperType = type.toUpperCase();
  if (
    upperType === "RECEIPT" ||
    upperType === "INVOICE" ||
    upperType === "STATEMENT" ||
    upperType === "OTHER"
  ) {
    return upperType as DocumentType;
  }
  return "OTHER" as DocumentType;
}

export function mapPrismaDocumentMatch(
  match: PrismaDocumentMatch
): DocumentMatch {
  return {
    id: match.id,
    documentId: match.documentId,
    transactionId: match.transactionId,
    confidence: match.confidence,
    status: match.status as DocumentMatch["status"],
    matchReason: match.matchReason || "",
    isUserConfirmed: match.isUserConfirmed,
    createdAt: match.createdAt,
  };
}

export function validateExtractedData(
  data: unknown
): ExtractedReceiptData | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  return {
    type: (typeof obj.type === "string"
      ? obj.type
      : "other") as ExtractedReceiptData["type"],
    vendor: typeof obj.vendor === "string" ? obj.vendor : undefined,
    amount: typeof obj.amount === "number" ? obj.amount : undefined,
    currency: typeof obj.currency === "string" ? obj.currency : "USD",
    date: typeof obj.date === "string" ? obj.date : undefined,
    tax: typeof obj.tax === "number" ? obj.tax : undefined,
    items: Array.isArray(obj.items)
      ? (obj.items as ExtractedReceiptData["items"])
      : undefined,
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
    notes: typeof obj.notes === "string" ? obj.notes : undefined,
  };
}
