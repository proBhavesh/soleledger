"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import type { ReconciliationAction } from "@/components/dashboard/receipts/reconciliation-dialog";
import { getCurrentBusinessId } from "./business-context-actions";
import { validateExtractedData } from "@/lib/types/documents";

// Schema for reconciliation action
const reconciliationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("match"),
    transactionId: z.string(),
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