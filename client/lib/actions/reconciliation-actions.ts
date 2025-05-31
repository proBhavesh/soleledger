"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { subDays } from "date-fns";

// Validation schemas
const updateReconciliationSchema = z.object({
  transactionId: z.string(),
  documentId: z.string().optional(),
  status: z.enum([
    "UNMATCHED",
    "MATCHED",
    "PARTIALLY_MATCHED",
    "PENDING_REVIEW",
    "MANUALLY_MATCHED",
    "EXCLUDED",
  ]),
  notes: z.string().optional(),
});

const bulkReconcileSchema = z.object({
  matches: z.array(
    z.object({
      transactionId: z.string(),
      documentId: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
});

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

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
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
): Promise<{
  success: boolean;
  data?: UnmatchedTransaction[];
  total?: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateReconciliationSchema.parse(data);

    // Verify transaction belongs to user's business
    const transaction = await db.transaction.findFirst({
      where: {
        id: validatedData.transactionId,
        business: { ownerId: session.user.id },
      },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found" };
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
export async function autoReconcileTransactions(): Promise<{
  success: boolean;
  data?: { processed: number; matched: number };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
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
): Promise<{ success: boolean; data?: { processed: number }; error?: string }> {
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
        business: { ownerId: session.user.id },
      },
    });

    if (transactions.length !== transactionIds.length) {
      return { success: false, error: "Some transactions not found" };
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
