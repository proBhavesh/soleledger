"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { buildUserBusinessWhere } from "@/lib/utils/permission-helpers";
import {
  generatePresignedUrl,
  validateFileType,
  validateFileSize,
} from "@/lib/storage/supabase-storage";
import {
  processReceiptWithAI,
  findTransactionMatches,
} from "@/lib/ai/receipt-processor";
import { subDays } from "date-fns";
import { z } from "zod";
import type {
  UploadRequest,
  UploadResult,
  ProcessDocumentRequest,
  ProcessResult,
  RecentDocumentsResult,
} from "@/lib/types/documents";
import {
  toDocumentType,
  mapPrismaDocumentMatch,
  validateExtractedData,
  toExtractedDataJson,
} from "@/lib/types/documents";

// Validation schemas
const uploadRequestSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
});

const processRequestSchema = z.object({
  fileUrl: z.string().url(),
  fileKey: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
});

/**
 * Generate presigned URL for document upload
 */
export async function generateUploadUrl(
  request: UploadRequest
): Promise<UploadResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = uploadRequestSchema.parse(request);

    // Validate file type
    if (!validateFileType(validatedData.fileType)) {
      return {
        success: false,
        error:
          "Invalid file type. Only images (JPEG, PNG, WebP) and PDFs are allowed.",
      };
    }

    // Validate file size
    if (!validateFileSize(validatedData.fileSize)) {
      return {
        success: false,
        error: "File too large. Maximum size is 10MB.",
      };
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

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.errors,
      };
    }

    return {
      success: false,
      error: "Failed to generate upload URL",
    };
  }
}

/**
 * Process uploaded document with AI
 */
export async function processDocument(
  request: ProcessDocumentRequest
): Promise<ProcessResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = processRequestSchema.parse(request);

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Create document record in database
    const document = await db.document.create({
      data: {
        businessId: business.id,
        userId: session.user.id,
        name: validatedData.fileName,
        type: "RECEIPT", // Default to receipt, AI will determine actual type
        url: validatedData.fileUrl,
        size: validatedData.fileSize,
        mimeType: validatedData.fileType,
        s3Bucket: process.env.AWS_S3_BUCKET,
        s3Key: validatedData.fileKey,
        originalFileName: validatedData.fileName,
        processingStatus: "PROCESSING",
      },
    });

    try {
      // Process with AI
      const extractedData = await processReceiptWithAI(
        validatedData.fileUrl,
        validatedData.fileType
      );

      // Get transactions for matching (last 30 days)
      const endDate = new Date();
      const startDate = subDays(endDate, 30);

      const transactions = await db.transaction.findMany({
        where: {
          businessId: business.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          amount: true,
          date: true,
          description: true,
        },
      });

      // Find potential matches
      const matches = await findTransactionMatches(extractedData, transactions);

      // Update document with extracted data
      const updatedDocument = await db.document.update({
        where: { id: document.id },
        data: {
          processingStatus: "COMPLETED",
          extractedData: toExtractedDataJson(
            extractedData
          ) as unknown as Prisma.InputJsonValue,
          extractedAmount: extractedData.amount,
          extractedDate: extractedData.date
            ? new Date(extractedData.date)
            : null,
          extractedVendor: extractedData.vendor,
          extractedTax: extractedData.tax,
          extractedCurrency: extractedData.currency,
          type: toDocumentType(extractedData.type),
        },
      });

      // Create matches in database
      const documentMatches = await Promise.all(
        matches.slice(0, 3).map(async (match) => {
          // Limit to top 3 matches
          return db.documentMatch.create({
            data: {
              documentId: document.id,
              transactionId: match.transactionId,
              confidence: match.confidence,
              matchReason: match.matchReason,
              status: match.confidence > 0.9 ? "CONFIRMED" : "SUGGESTED",
            },
          });
        })
      );

      // If we have a high-confidence match, auto-link the document
      if (matches.length > 0 && matches[0].confidence > 0.9) {
        await db.document.update({
          where: { id: document.id },
          data: {
            transactionId: matches[0].transactionId,
          },
        });
      }

      // Map Prisma types to our interfaces
      const processedDocument = {
        id: updatedDocument.id,
        name: updatedDocument.name,
        type: updatedDocument.type,
        url: updatedDocument.url,
        size: updatedDocument.size,
        mimeType: updatedDocument.mimeType,
        processingStatus: updatedDocument.processingStatus,
        extractedData: validateExtractedData(updatedDocument.extractedData),
        extractedAmount: updatedDocument.extractedAmount,
        extractedDate: updatedDocument.extractedDate,
        extractedVendor: updatedDocument.extractedVendor,
        extractedTax: updatedDocument.extractedTax,
        extractedCurrency: updatedDocument.extractedCurrency,
        matches: documentMatches.map(mapPrismaDocumentMatch),
        createdAt: updatedDocument.createdAt,
      };

      return {
        success: true,
        data: {
          document: processedDocument,
          extractedData,
          matches: documentMatches.map(mapPrismaDocumentMatch),
        },
      };
    } catch (aiError) {
      console.error("AI processing error:", aiError);

      // Update document with error status
      await db.document.update({
        where: { id: document.id },
        data: {
          processingStatus: "FAILED",
          processingError:
            aiError instanceof Error ? aiError.message : "Unknown error",
        },
      });

      const errorDocument = {
        id: document.id,
        name: document.name,
        type: document.type,
        url: document.url,
        size: document.size,
        mimeType: document.mimeType,
        processingStatus: "FAILED" as const,
        extractedData: null,
        extractedAmount: null,
        extractedDate: null,
        extractedVendor: null,
        extractedTax: null,
        extractedCurrency: null,
        matches: [],
        createdAt: document.createdAt,
      };

      return {
        success: false,
        error: "AI processing failed",
        data: {
          document: errorDocument,
          extractedData: {
            type: "other" as const,
            vendor: undefined,
            amount: undefined,
            currency: "USD",
            date: undefined,
            tax: undefined,
            confidence: 0,
          },
          matches: [],
        },
      };
    }
  } catch (error) {
    console.error("Error processing document:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.errors,
      };
    }

    return {
      success: false,
      error: "Internal server error",
    };
  }
}

/**
 * Get recent documents for the user
 */
export async function getRecentDocuments(): Promise<RecentDocumentsResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Fetch recent documents with matches
    const documents = await db.document.findMany({
      where: {
        businessId: business.id,
        userId: session.user.id,
      },
      include: {
        matches: {
          select: {
            confidence: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // Limit to last 20 documents
    });

    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.mimeType || doc.type,
      processingStatus: doc.processingStatus as string,
      extractedVendor: doc.extractedVendor ?? undefined,
      extractedAmount: doc.extractedAmount ?? undefined,
      url: doc.url,
      createdAt: doc.createdAt.toISOString(),
      matches: doc.matches,
    }));

    return {
      success: true,
      data: { documents: formattedDocuments },
    };
  } catch (error) {
    console.error("Error fetching recent documents:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}
