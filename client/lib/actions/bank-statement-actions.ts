"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { z } from "zod";
import {
  generatePresignedUrl,
  validateFileSize,
} from "@/lib/storage/supabase-storage";
import {
  processBankStatementWithAI,
  type BankStatementTransaction,
} from "@/lib/ai/bank-statement-processor";
import { getCurrentBusinessId } from "./business-context-actions";
import { bulkImportBankTransactions } from "./bank-import-actions";
import { subDays, addDays } from "date-fns";
import { checkDocumentUploadLimit, incrementDocumentUploadCount } from "@/lib/services/usage-tracking";
import { hasChartOfAccounts } from "./chart-of-accounts-actions";

// Validation schemas
const uploadRequestSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
  bankAccountId: z.string().min(1),
});

const importRequestSchema = z.object({
  documentId: z.string(),
  bankAccountId: z.string(),
  transactions: z.array(z.object({
    date: z.string(),
    description: z.string(),
    amount: z.number(),
    type: z.enum(["debit", "credit"]),
    suggestedCategory: z.string().optional(),
    selected: z.boolean().default(true),
  })),
});

interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number;
  matchedTransaction?: {
    id: string;
    date: Date;
    amount: number;
    description: string;
  };
}

/**
 * Generate presigned URL for bank statement upload
 */
export async function generateBankStatementUploadUrl(request: {
  fileName: string;
  fileType: string;
  fileSize: number;
  bankAccountId: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: "No business found" };
    }
    
    // Check if business has Chart of Accounts set up
    const hasAccounts = await hasChartOfAccounts(businessId);
    if (!hasAccounts) {
      return { 
        success: false, 
        error: "Chart of Accounts not set up. Please set up your Chart of Accounts first." 
      };
    }

    const validatedData = uploadRequestSchema.parse(request);

    // Validate file type (only PDF for bank statements)
    if (validatedData.fileType !== "application/pdf") {
      return {
        success: false,
        error: "Invalid file type. Only PDF files are allowed for bank statements.",
      };
    }

    // Validate file size
    if (!validateFileSize(validatedData.fileSize)) {
      return {
        success: false,
        error: "File too large. Maximum size is 10MB.",
      };
    }

    // Verify user has access to the bank account
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        id: validatedData.bankAccountId,
        businessId,
      },
    });

    if (!bankAccount) {
      return { success: false, error: "Bank account not found" };
    }

    // Generate presigned URL
    const presignedData = await generatePresignedUrl(
      validatedData.fileName,
      validatedData.fileType,
      session.user.id
    );

    return {
      success: true,
      data: presignedData,
    };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return {
      success: false,
      error: "Failed to generate upload URL",
    };
  }
}

/**
 * Process uploaded bank statement
 */
export async function processBankStatement(request: {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  bankAccountId: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: "No business found" };
    }

    // Check document upload limit
    const usageCheck = await checkDocumentUploadLimit(session.user.id, businessId);
    if (!usageCheck.allowed) {
      return { success: false, error: usageCheck.message || "Document upload limit exceeded" };
    }

    // Create document record
    const document = await db.document.create({
      data: {
        businessId,
        userId: session.user.id,
        name: request.fileName,
        type: "STATEMENT",
        url: request.fileUrl,
        size: request.fileSize,
        mimeType: request.fileType,
        processingStatus: "PROCESSING",
        s3Bucket: process.env.STORAGE_BUCKET_NAME!,
        s3Key: request.fileKey,
        originalFileName: request.fileName,
      },
    });

    try {
      // Process with AI
      const extractedData = await processBankStatementWithAI(request.fileUrl);

      // Check for duplicate transactions
      const duplicateChecks = await Promise.all(
        extractedData.transactions.map((tx) =>
          checkForDuplicate(tx, request.bankAccountId, businessId)
        )
      );

      // Update document with extracted data
      await db.document.update({
        where: { id: document.id },
        data: {
          processingStatus: "COMPLETED",
          extractedData: extractedData as unknown as Prisma.InputJsonValue,
          extractedDate: extractedData.startDate ? new Date(extractedData.startDate) : null,
          notes: extractedData.notes,
        },
      });

      // Increment document upload count after successful processing
      await incrementDocumentUploadCount(businessId);

      // Return processed data with duplicate info
      return {
        success: true,
        data: {
          documentId: document.id,
          extractedData,
          duplicateChecks,
        },
      };
    } catch (error) {
      // Update document status on error
      await db.document.update({
        where: { id: document.id },
        data: {
          processingStatus: "FAILED",
          processingError: error instanceof Error ? error.message : "Processing failed",
        },
      });

      throw error;
    }
  } catch (error) {
    console.error("Error processing bank statement:", error);
    return {
      success: false,
      error: "Failed to process bank statement",
    };
  }
}

/**
 * Check if a transaction is a duplicate
 */
async function checkForDuplicate(
  transaction: BankStatementTransaction,
  bankAccountId: string,
  businessId: string
): Promise<DuplicateCheckResult> {
  // Check for transactions within ±2 days and ±1% amount
  const dateFrom = subDays(new Date(transaction.date), 2);
  const dateTo = addDays(new Date(transaction.date), 2);
  const amountTolerance = transaction.amount * 0.01;
  const minAmount = transaction.amount - amountTolerance;
  const maxAmount = transaction.amount + amountTolerance;

  const potentialDuplicates = await db.transaction.findMany({
    where: {
      businessId,
      bankAccountId,
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
      amount: {
        gte: minAmount,
        lte: maxAmount,
      },
      type: transaction.type === "debit" ? "EXPENSE" : "INCOME",
    },
    take: 5,
  });

  if (potentialDuplicates.length === 0) {
    return { isDuplicate: false, confidence: 0 };
  }

  // Find best match based on amount and date proximity
  let bestMatch = potentialDuplicates[0];
  let highestConfidence = 0;

  for (const duplicate of potentialDuplicates) {
    const amountMatch = 1 - Math.abs(duplicate.amount - transaction.amount) / transaction.amount;
    const daysDiff = Math.abs(
      (new Date(transaction.date).getTime() - duplicate.date.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dateMatch = 1 - daysDiff / 2; // Max 2 days difference

    const confidence = (amountMatch * 0.7 + dateMatch * 0.3);

    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestMatch = duplicate;
    }
  }

  return {
    isDuplicate: highestConfidence > 0.9,
    confidence: highestConfidence,
    matchedTransaction: {
      id: bestMatch.id,
      date: bestMatch.date,
      amount: bestMatch.amount,
      description: bestMatch.description || "",
    },
  };
}

/**
 * Import selected transactions from bank statement
 */
export async function importBankStatementTransactions(request: {
  documentId: string;
  bankAccountId: string;
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: "debit" | "credit";
    suggestedCategory?: string;
    selected: boolean;
  }>;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: "No business found" };
    }

    const validatedData = importRequestSchema.parse(request);

    // Verify document exists and belongs to user
    const document = await db.document.findFirst({
      where: {
        id: validatedData.documentId,
        businessId,
        type: "STATEMENT",
      },
    });

    if (!document) {
      return { success: false, error: "Bank statement not found" };
    }

    // Verify bank account
    const bankAccount = await db.bankAccount.findFirst({
      where: {
        id: validatedData.bankAccountId,
        businessId,
      },
    });

    if (!bankAccount) {
      return { success: false, error: "Bank account not found" };
    }

    // Filter selected transactions
    const selectedTransactions = validatedData.transactions.filter(tx => tx.selected);

    if (selectedTransactions.length === 0) {
      return { success: false, error: "No transactions selected for import" };
    }

    // Transform transactions to match the format expected by bulkImportBankTransactions
    const transformedTransactions = selectedTransactions.map(tx => ({
      date: tx.date,
      description: tx.description,
      amount: tx.type === "credit" ? tx.amount : -tx.amount, // Negative for expenses
      category: tx.suggestedCategory, // Use AI-suggested category
      notes: `Imported from PDF bank statement`,
    }));

    // Use the same import pipeline as CSV/Excel for consistency
    const result = await bulkImportBankTransactions({
      bankAccountId: validatedData.bankAccountId,
      transactions: transformedTransactions,
    });

    if (!result.success) {
      // Update document status to failed
      await db.document.update({
        where: { id: document.id },
        data: {
          processingStatus: "FAILED",
          processingError: result.errors?.[0]?.error || "Import failed",
          extractedData: {
            ...((document.extractedData as object) || {}),
            importError: result.errors?.[0]?.error,
            importedTransactions: 0,
            failedTransactions: result.failedCount || selectedTransactions.length,
          },
        },
      });
      
      // Return in the expected format
      return {
        success: false,
        error: result.errors?.[0]?.error || "Import failed",
        data: {
          imported: result.successCount || 0,
          failed: result.failedCount || selectedTransactions.length,
          skipped: 0,
          total: selectedTransactions.length,
        },
      };
    }

    // Update document with success status
    await db.document.update({
      where: { id: document.id },
      data: {
        processingStatus: "COMPLETED",
        notes: `Imported ${result.successCount || 0} transactions to ${bankAccount.name}`,
        extractedData: {
          ...((document.extractedData as object) || {}),
          importedTransactions: result.successCount || 0,
          failedTransactions: result.failedCount || 0,
        },
      },
    });

    // Return in the expected format
    return {
      success: true,
      data: {
        imported: result.successCount || 0,
        failed: result.failedCount || 0,
        skipped: 0,
        total: selectedTransactions.length,
      },
    };
  } catch (error) {
    console.error("Error importing transactions:", error);
    return {
      success: false,
      error: "Failed to import transactions",
    };
  }
}


/**
 * Get bank statement import history
 */
export async function getBankStatementHistory() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: "No business found" };
    }

    const statements = await db.document.findMany({
      where: {
        businessId,
        type: "STATEMENT",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return {
      success: true,
      data: statements.map(stmt => {
        let transactionCount = 0;
        
        // Check if extractedData has import results
        const extractedData = stmt.extractedData as {
          importedTransactions?: number;
          transactions?: unknown[];
        } | null;
        if (extractedData) {
          if (extractedData.importedTransactions !== undefined) {
            // For CSV/Excel imports, use the actual imported count
            transactionCount = extractedData.importedTransactions;
          } else if (extractedData.transactions) {
            // For PDF processing, count transactions array
            transactionCount = extractedData.transactions.length || 0;
          }
        }
        
        return {
          id: stmt.id,
          name: stmt.name,
          uploadedAt: stmt.createdAt.toISOString(),
          status: stmt.processingStatus,
          transactionCount,
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching bank statement history:", error);
    return {
      success: false,
      error: "Failed to fetch import history",
    };
  }
}