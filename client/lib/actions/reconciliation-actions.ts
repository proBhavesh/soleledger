"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { subDays } from "date-fns";
import { buildUserBusinessWhere, buildTransactionPermissionWhere } from "@/lib/utils/permission-helpers";
import {
  updateReconciliationSchema,
  bulkReconcileSchema,
  type ReconciliationSummary,
  type UnmatchedTransaction,
  type MatchedTransaction,
  type ReconciliationActionResponse,
  type GetUnmatchedTransactionsResponse,
  type GetAvailableDocumentsResponse,
  type GetRecentlyMatchedTransactionsResponse,
  type AutoReconcileResponse,
  type BulkReconcileResponse,
} from "@/lib/types/reconciliation";

/**
 * Get reconciliation dashboard summary
 */
export async function getReconciliationSummary(
  startDate?: Date,
  endDate?: Date
): Promise<{ success: boolean; data?: ReconciliationSummary; error?: string }> {
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

    // Default to last 90 days if no date range provided
    const defaultStartDate = startDate || subDays(new Date(), 90);
    const defaultEndDate = endDate || new Date();

    // Get all transactions in the date range
    const transactions = await db.transaction.findMany({
      where: {
        businessId: business.id,
        date: {
          gte: defaultStartDate,
          lte: defaultEndDate,
        },
      },
      include: {
        reconciliation: true,
        category: true,
        bankAccount: true,
      },
    });

    // Calculate summary statistics
    const totalTransactions = transactions.length;
    const matchedTransactions = transactions.filter(
      (t) =>
        t.reconciliation?.status === "MATCHED" ||
        t.reconciliation?.status === "MANUALLY_MATCHED"
    ).length;
    const unmatchedTransactions = transactions.filter(
      (t) => !t.reconciliation || t.reconciliation.status === "UNMATCHED"
    ).length;
    const pendingReview = transactions.filter(
      (t) => t.reconciliation?.status === "PENDING_REVIEW"
    ).length;

    const totalAmount = transactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const matchedAmount = transactions
      .filter(
        (t) =>
          t.reconciliation?.status === "MATCHED" ||
          t.reconciliation?.status === "MANUALLY_MATCHED"
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const unmatchedAmount = totalAmount - matchedAmount;

    const matchedPercentage =
      totalTransactions > 0
        ? (matchedTransactions / totalTransactions) * 100
        : 0;

    const summary: ReconciliationSummary = {
      totalTransactions,
      matchedTransactions,
      unmatchedTransactions,
      pendingReview,
      matchedPercentage,
      totalAmount,
      matchedAmount,
      unmatchedAmount,
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error("Error getting reconciliation summary:", error);
    return { success: false, error: "Failed to get reconciliation summary" };
  }
}

/**
 * Get unmatched transactions with potential document matches
 */
export async function getUnmatchedTransactions(
  limit: number = 50,
  offset: number = 0
): Promise<GetUnmatchedTransactionsResponse> {
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

    // Get unmatched transactions
    const transactions = await db.transaction.findMany({
      where: {
        businessId: business.id,
        OR: [
          { reconciliation: null },
          { reconciliation: { status: "UNMATCHED" } },
          { reconciliation: { status: "PENDING_REVIEW" } },
        ],
      },
      include: {
        reconciliation: true,
        category: true,
        bankAccount: true,
        matches: {
          include: {
            document: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await db.transaction.count({
      where: {
        businessId: business.id,
        OR: [
          { reconciliation: null },
          { reconciliation: { status: "UNMATCHED" } },
          { reconciliation: { status: "PENDING_REVIEW" } },
        ],
      },
    });

    // Format the data
    const unmatchedTransactions: UnmatchedTransaction[] = transactions.map(
      (transaction) => ({
        id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category?.name || null,
        bankAccount: transaction.bankAccount?.name || null,
        reconciliationStatus: transaction.reconciliation?.status || "UNMATCHED",
        potentialMatches: transaction.matches.map((match) => ({
          documentId: match.document.id,
          documentName: match.document.name,
          confidence: match.confidence,
          extractedVendor: match.document.extractedVendor,
          extractedAmount: match.document.extractedAmount,
        })),
      })
    );

    return { success: true, data: unmatchedTransactions, total };
  } catch (error) {
    console.error("Error getting unmatched transactions:", error);
    return { success: false, error: "Failed to get unmatched transactions" };
  }
}

/**
 * Manually update reconciliation status
 */
export async function updateReconciliationStatus(
  data: z.infer<typeof updateReconciliationSchema>
): Promise<ReconciliationActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateReconciliationSchema.parse(data);

    // Verify transaction belongs to user's business
    const transaction = await db.transaction.findFirst({
      where: buildTransactionPermissionWhere(
        validatedData.transactionId,
        session.user.id,
        false
      ),
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found or access denied" };
    }

    // Update or create reconciliation status
    await db.reconciliationStatus.upsert({
      where: { transactionId: validatedData.transactionId },
      update: {
        status: validatedData.status,
        documentId: validatedData.documentId,
        notes: validatedData.notes,
        manuallySet: true,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        transactionId: validatedData.transactionId,
        status: validatedData.status,
        documentId: validatedData.documentId,
        notes: validatedData.notes,
        manuallySet: true,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating reconciliation status:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid data provided" };
    }
    return { success: false, error: "Failed to update reconciliation status" };
  }
}

/**
 * Auto-reconcile transactions based on existing document matches
 */
export async function autoReconcileTransactions(): Promise<AutoReconcileResponse> {
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

    // Get transactions without reconciliation status that have high-confidence matches
    const transactions = await db.transaction.findMany({
      where: {
        businessId: business.id,
        reconciliation: null,
        matches: {
          some: {
            confidence: { gte: 0.8 },
            status: "SUGGESTED",
          },
        },
      },
      include: {
        matches: {
          where: {
            confidence: { gte: 0.8 },
            status: "SUGGESTED",
          },
          include: {
            document: true,
          },
          orderBy: { confidence: "desc" },
          take: 1,
        },
      },
    });

    let matched = 0;
    const processed = transactions.length;

    // Auto-reconcile high-confidence matches
    for (const transaction of transactions) {
      if (transaction.matches.length > 0) {
        const bestMatch = transaction.matches[0];

        await db.$transaction([
          // Create reconciliation status
          db.reconciliationStatus.create({
            data: {
              transactionId: transaction.id,
              documentId: bestMatch.document.id,
              status: "MATCHED",
              confidence: bestMatch.confidence,
              manuallySet: false,
              reviewedBy: session.user.id,
              reviewedAt: new Date(),
            },
          }),
          // Update document match status
          db.documentMatch.update({
            where: { id: bestMatch.id },
            data: { status: "CONFIRMED" },
          }),
        ]);

        matched++;
      }
    }

    return { success: true, data: { processed, matched } };
  } catch (error) {
    console.error("Error auto-reconciling transactions:", error);
    return { success: false, error: "Failed to auto-reconcile transactions" };
  }
}

/**
 * Bulk reconcile multiple transactions
 */
export async function bulkReconcileTransactions(
  data: z.infer<typeof bulkReconcileSchema>
): Promise<BulkReconcileResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = bulkReconcileSchema.parse(data);

    // Verify all transactions belong to user's business
    const transactionIds = validatedData.matches.map((m) => m.transactionId);
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        OR: [
          // Check if user is the business owner
          { business: { ownerId: session.user.id } },
          // Check if user is a member with permissions
          {
            business: {
              members: {
                some: {
                  userId: session.user.id,
                  OR: [
                    { role: "BUSINESS_OWNER" },
                    { role: "ACCOUNTANT" },
                    { accessLevel: { in: ["FULL_MANAGEMENT", "FINANCIAL_ONLY"] } },
                  ],
                },
              },
            },
          },
        ],
      },
    });

    if (transactions.length !== transactionIds.length) {
      return { success: false, error: "Some transactions not found or access denied" };
    }

    // Bulk create reconciliation statuses
    const reconciliationData = validatedData.matches.map((match) => ({
      transactionId: match.transactionId,
      documentId: match.documentId,
      status: "MANUALLY_MATCHED" as const,
      confidence: match.confidence,
      manuallySet: true,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    }));

    await db.reconciliationStatus.createMany({
      data: reconciliationData,
      skipDuplicates: true,
    });

    return { success: true, data: { processed: validatedData.matches.length } };
  } catch (error) {
    console.error("Error bulk reconciling transactions:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid data provided" };
    }
    return { success: false, error: "Failed to bulk reconcile transactions" };
  }
}

/**
 * Get available documents for manual matching
 */
export async function getAvailableDocuments(
  transactionDate?: Date,
  transactionAmount?: number
): Promise<GetAvailableDocumentsResponse> {
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

    // Get all processed documents
    const documents = await db.document.findMany({
      where: {
        businessId: business.id,
        processingStatus: "COMPLETED",
        transactionId: null, // Only get unmatched documents
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate match scores if transaction info provided
    const documentsWithScores = documents.map((doc) => {
      let matchScore = 0;
      
      if (transactionAmount && doc.extractedAmount) {
        const amountDiff = Math.abs(transactionAmount - doc.extractedAmount);
        const amountTolerance = transactionAmount * 0.05; // 5% tolerance
        if (amountDiff <= amountTolerance) {
          matchScore += 0.5;
        }
      }
      
      if (transactionDate && doc.extractedDate) {
        const daysDiff = Math.abs(
          (transactionDate.getTime() - doc.extractedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff <= 7) {
          matchScore += 0.3;
        }
      }

      return {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        extractedVendor: doc.extractedVendor,
        extractedAmount: doc.extractedAmount,
        extractedDate: doc.extractedDate,
        processingStatus: doc.processingStatus,
        url: doc.url,
        matchScore,
      };
    });

    // Sort by match score if transaction info was provided
    if (transactionDate || transactionAmount) {
      documentsWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return { success: true, data: documentsWithScores };
  } catch (error) {
    console.error("Error getting available documents:", error);
    return { success: false, error: "Failed to get available documents" };
  }
}

/**
 * Manually match a transaction with a document
 */
export async function manuallyMatchTransaction(
  transactionId: string,
  documentId: string,
  notes?: string
): Promise<ReconciliationActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify transaction and document belong to user's business
    const transaction = await db.transaction.findFirst({
      where: buildTransactionPermissionWhere(
        transactionId,
        session.user.id,
        false
      ),
    });

    const document = await db.document.findFirst({
      where: {
        id: documentId,
        business: buildUserBusinessWhere(session.user.id),
      },
    });

    if (!transaction || !document) {
      return { success: false, error: "Transaction or document not found or access denied" };
    }

    // Create or update the match
    await db.$transaction([
      // Create or update reconciliation status
      db.reconciliationStatus.upsert({
        where: { transactionId },
        update: {
          documentId,
          status: "MANUALLY_MATCHED",
          manuallySet: true,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          notes,
        },
        create: {
          transactionId,
          documentId,
          status: "MANUALLY_MATCHED",
          manuallySet: true,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          notes,
        },
      }),
      // Create or update document match
      db.documentMatch.upsert({
        where: {
          documentId_transactionId: {
            documentId,
            transactionId,
          },
        },
        update: {
          status: "MANUAL",
          confidence: 1.0,
          isUserConfirmed: true,
        },
        create: {
          documentId,
          transactionId,
          status: "MANUAL",
          confidence: 1.0,
          isUserConfirmed: true,
          matchReason: notes || "Manually matched by user",
        },
      }),
      // Update document to link it to the transaction
      db.document.update({
        where: { id: documentId },
        data: { transactionId },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error manually matching transaction:", error);
    return { success: false, error: "Failed to match transaction" };
  }
}

/**
 * Unmatch a previously matched transaction
 */
export async function unmatchTransaction(
  transactionId: string
): Promise<ReconciliationActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify transaction belongs to user's business
    const transaction = await db.transaction.findFirst({
      where: buildTransactionPermissionWhere(
        transactionId,
        session.user.id,
        false
      ),
      include: {
        reconciliation: true,
      },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found" };
    }

    const documentId = transaction.reconciliation?.documentId;

    // Remove the match
    await db.$transaction([
      // Update reconciliation status
      db.reconciliationStatus.update({
        where: { transactionId },
        data: {
          status: "UNMATCHED",
          documentId: null,
          manuallySet: true,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          notes: "Manually unmatched by user",
        },
      }),
      // Remove document link if exists
      ...(documentId
        ? [
            db.document.update({
              where: { id: documentId },
              data: { transactionId: null },
            }),
          ]
        : []),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error unmatching transaction:", error);
    return { success: false, error: "Failed to unmatch transaction" };
  }
}

/**
 * Get recently matched transactions
 */
export async function getRecentlyMatchedTransactions(
  limit: number = 10
): Promise<GetRecentlyMatchedTransactionsResponse> {
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

    // Get recently matched transactions
    const transactions = await db.transaction.findMany({
      where: {
        businessId: business.id,
        reconciliation: {
          status: {
            in: ["MATCHED", "MANUALLY_MATCHED"],
          },
        },
      },
      include: {
        reconciliation: {
          include: {
            document: true,
            reviewer: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        category: true,
        bankAccount: true,
      },
      orderBy: {
        reconciliation: {
          reviewedAt: "desc",
        },
      },
      take: limit,
    });

    // Format the data
    const matchedTransactions: MatchedTransaction[] = transactions.map(
      (transaction) => ({
        id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category?.name || null,
        bankAccount: transaction.bankAccount?.name || null,
        reconciliationStatus: transaction.reconciliation?.status || "MATCHED",
        matchedDocument: transaction.reconciliation?.document
          ? {
              id: transaction.reconciliation.document.id,
              name: transaction.reconciliation.document.name,
              type: transaction.reconciliation.document.type,
              extractedVendor: transaction.reconciliation.document.extractedVendor,
              extractedAmount: transaction.reconciliation.document.extractedAmount,
              extractedDate: transaction.reconciliation.document.extractedDate,
            }
          : undefined,
        matchedAt: transaction.reconciliation?.reviewedAt || undefined,
        matchedBy: transaction.reconciliation?.reviewer?.name || undefined,
        isManualMatch: transaction.reconciliation?.manuallySet || false,
      })
    );

    return { success: true, data: matchedTransactions };
  } catch (error) {
    console.error("Error getting recently matched transactions:", error);
    return { success: false, error: "Failed to get matched transactions" };
  }
}
