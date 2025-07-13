"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import type { ReconciliationAction } from "@/components/dashboard/receipts/reconciliation-dialog";
import { createExpenseTransaction } from "./transaction-journal-actions";
import { getCurrentBusinessId } from "./business-context-actions";
import { checkTransactionLimit } from "@/lib/services/usage-tracking";
import type { ExtractedReceiptData } from "@/lib/types/documents";
import { validateExtractedData } from "@/lib/types/documents";

// Schema for reconciliation action
const reconciliationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("match"),
    transactionId: z.string(),
  }),
  z.object({
    type: z.literal("split"),
    splits: z.array(
      z.object({
        amount: z.number(),
        category: z.string(),
        description: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal("create"),
    category: z.string().optional(),
  }),
  z.object({
    type: z.literal("skip"),
  }),
]);

interface ProcessReconciliationRequest {
  documentId: string;
  action: ReconciliationAction;
}

/**
 * Process a reconciliation action for a document
 */
export async function processReconciliationAction(
  request: ProcessReconciliationRequest
): Promise<{ success: boolean; error?: string; data?: { transactionCount?: number; transactionIds?: string[]; transactionId?: string } }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: "No business selected" };
    }

    const validatedAction = reconciliationActionSchema.parse(request.action);

    // Get the document with its extracted data
    const document = await db.document.findFirst({
      where: {
        id: request.documentId,
        businessId,
      },
      include: {
        matches: true,
      },
    });

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Parse extracted data
    const extractedData = validateExtractedData(document.extractedData);
    if (!extractedData) {
      return { success: false, error: "No extracted data found" };
    }

    switch (validatedAction.type) {
      case "match":
        return await handleMatchAction(document.id, validatedAction.transactionId);

      case "split":
        return await handleSplitAction(
          document.id,
          validatedAction.splits,
          extractedData,
          businessId,
          session.user.id
        );

      case "create":
        return await handleCreateAction(
          document.id,
          extractedData,
          businessId,
          session.user.id,
          validatedAction.category
        );

      case "skip":
        // Just mark the document as reviewed
        await db.document.update({
          where: { id: document.id },
          data: { verifiedAt: new Date() },
        });
        return { success: true };

      default:
        return { success: false, error: "Invalid action type" };
    }
  } catch (error) {
    console.error("Error processing reconciliation action:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid request data" };
    }
    return { success: false, error: "Failed to process reconciliation action" };
  }
}

/**
 * Handle matching a document to an existing transaction
 */
async function handleMatchAction(
  documentId: string,
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if match already exists
    const existingMatch = await db.documentMatch.findUnique({
      where: {
        documentId_transactionId: {
          documentId,
          transactionId,
        },
      },
    });

    if (existingMatch) {
      // Update existing match to confirmed
      await db.documentMatch.update({
        where: { id: existingMatch.id },
        data: {
          status: "CONFIRMED",
          isUserConfirmed: true,
          confidence: 1.0,
        },
      });
    } else {
      // Create new confirmed match
      await db.documentMatch.create({
        data: {
          documentId,
          transactionId,
          status: "CONFIRMED",
          isUserConfirmed: true,
          confidence: 1.0,
          matchReason: "Manually matched by user",
        },
      });
    }

    // Update document with primary transaction (for backward compatibility)
    await db.document.update({
      where: { id: documentId },
      data: {
        transactionId,
        verifiedAt: new Date(),
      },
    });

    // Create or update reconciliation status
    await db.reconciliationStatus.upsert({
      where: { transactionId },
      create: {
        transactionId,
        status: "MANUALLY_MATCHED",
        documentId,
        reviewedAt: new Date(),
        reviewedBy: "user",
      },
      update: {
        status: "MANUALLY_MATCHED",
        documentId,
        reviewedAt: new Date(),
        reviewedBy: "user",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error in handleMatchAction:", error);
    return { success: false, error: "Failed to match document to transaction" };
  }
}

/**
 * Handle splitting a document into multiple transactions
 */
async function handleSplitAction(
  documentId: string,
  splits: Array<{ amount: number; category: string; description: string }>,
  extractedData: ExtractedReceiptData,
  businessId: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: { transactionCount: number; transactionIds: string[] } }> {
  try {
    // Check transaction limits
    const usageCheck = await checkTransactionLimit(userId, businessId, splits.length);
    if (!usageCheck.allowed) {
      return { success: false, error: usageCheck.message || "Transaction limit exceeded" };
    }

    // Get category IDs for the splits
    const categories = await db.category.findMany({
      where: {
        businessId,
        name: { in: splits.map(s => s.category) },
      },
    });

    const categoryMap = new Map(categories.map(c => [c.name, c.id]));

    // Create transactions for each split
    const createdTransactions = [];
    
    for (const split of splits) {
      const categoryId = categoryMap.get(split.category);
      if (!categoryId) {
        console.warn(`Category not found: ${split.category}`);
        continue;
      }

      // Get cash account for the business
      const cashAccount = await db.category.findFirst({
        where: {
          businessId,
          accountCode: "1000", // Cash account
          accountType: "ASSET",
        },
      });

      if (!cashAccount) {
        console.error("No cash account found for business:", businessId);
        continue;
      }

      // Create expense transaction
      const result = await createExpenseTransaction({
        businessId,
        date: extractedData.date ? new Date(extractedData.date) : new Date(),
        description: `${extractedData.vendor || 'Unknown'} - ${split.description}`,
        amount: split.amount,
        expenseCategoryId: categoryId,
        cashAccountId: cashAccount.id,
        notes: `Split from receipt: ${extractedData.vendor || 'Unknown'}`,
      });

      if (result.success && result.transaction) {
        createdTransactions.push(result.transaction);

        // Create document match for this transaction
        await db.documentMatch.create({
          data: {
            documentId,
            transactionId: result.transaction.id,
            status: "CONFIRMED",
            isUserConfirmed: true,
            confidence: 1.0,
            matchReason: "Created from receipt split",
          },
        });

        // Create reconciliation status
        await db.reconciliationStatus.create({
          data: {
            transactionId: result.transaction.id,
            status: "MANUALLY_MATCHED",
            documentId,
            reviewedAt: new Date(),
            reviewedBy: userId,
          },
        });
      }
    }

    // Update document as verified
    await db.document.update({
      where: { id: documentId },
      data: {
        verifiedAt: new Date(),
        // Set the first transaction as primary for backward compatibility
        transactionId: createdTransactions[0]?.id,
      },
    });

    return {
      success: true,
      data: {
        transactionCount: createdTransactions.length,
        transactionIds: createdTransactions.map(t => t.id),
      },
    };
  } catch (error) {
    console.error("Error in handleSplitAction:", error);
    return { success: false, error: "Failed to create split transactions" };
  }
}

/**
 * Handle creating a new transaction from document
 */
async function handleCreateAction(
  documentId: string,
  extractedData: ExtractedReceiptData,
  businessId: string,
  userId: string,
  categoryName?: string
): Promise<{ success: boolean; error?: string; data?: { transactionId: string } }> {
  try {
    // Check transaction limits
    const usageCheck = await checkTransactionLimit(userId, businessId, 1);
    if (!usageCheck.allowed) {
      return { success: false, error: usageCheck.message || "Transaction limit exceeded" };
    }

    // Find category by name if provided
    let categoryId: string | undefined;
    if (categoryName) {
      const category = await db.category.findFirst({
        where: {
          businessId,
          name: categoryName,
        },
      });
      categoryId = category?.id;
    }

    // If no category found, try to find a default expense category
    if (!categoryId) {
      const defaultCategory = await db.category.findFirst({
        where: {
          businessId,
          accountCode: "5999", // Miscellaneous expense
        },
      });
      categoryId = defaultCategory?.id;
      
      // If still no category, find any expense category
      if (!categoryId) {
        const anyExpenseCategory = await db.category.findFirst({
          where: {
            businessId,
            accountType: "EXPENSE",
          },
        });
        categoryId = anyExpenseCategory?.id;
      }
    }
    
    if (!categoryId) {
      return { success: false, error: "No expense category found for business" };
    }

    // Get cash account for the business
    const cashAccount = await db.category.findFirst({
      where: {
        businessId,
        accountCode: "1000", // Cash account
        accountType: "ASSET",
      },
    });

    if (!cashAccount) {
      return { success: false, error: "No cash account found for business" };
    }

    // Create expense transaction
    const result = await createExpenseTransaction({
      businessId,
      date: extractedData.date ? new Date(extractedData.date) : new Date(),
      description: `${extractedData.vendor || 'Receipt'} - ${extractedData.notes || 'Expense'}`,
      amount: extractedData.amount || 0,
      expenseCategoryId: categoryId,
      cashAccountId: cashAccount.id,
      notes: `Created from receipt`,
    });

    if (!result.success || !result.transaction) {
      return { success: false, error: result.error || "Failed to create transaction" };
    }

    // Create document match
    await db.documentMatch.create({
      data: {
        documentId,
        transactionId: result.transaction.id,
        status: "CONFIRMED",
        isUserConfirmed: true,
        confidence: 1.0,
        matchReason: "Created from receipt",
      },
    });

    // Update document
    await db.document.update({
      where: { id: documentId },
      data: {
        transactionId: result.transaction.id,
        verifiedAt: new Date(),
      },
    });

    // Create reconciliation status
    await db.reconciliationStatus.create({
      data: {
        transactionId: result.transaction.id,
        status: "MANUALLY_MATCHED",
        documentId,
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    });

    return {
      success: true,
      data: {
        transactionId: result.transaction.id,
      },
    };
  } catch (error) {
    console.error("Error in handleCreateAction:", error);
    return { success: false, error: "Failed to create transaction" };
  }
}