"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { transformPrismaTransaction } from "@/lib/utils/transaction-transformers";
import { 
  buildTransactionPermissionWhere, 
  buildUserBusinessWhere,
  getPermissionErrorMessage 
} from "@/lib/utils/permission-helpers";
import { logger } from "@/lib/utils/logger";
import {
  updateTransactionSchema,
  updateCategorySchema,
  updateReconciliationSchema,
  type UpdateTransactionData,
  type UpdateCategoryData,
  type UpdateReconciliationData,
  type UpdateTransactionResponse,
  type DeleteTransactionResponse,
  type UpdateTransactionCategoryResponse,
  type ToggleTransactionReconciliationResponse,
  type GetBusinessCategoriesResponse,
} from "@/lib/types/transaction-operations";

/**
 * Update transaction details
 */
export async function updateTransaction(data: UpdateTransactionData): Promise<UpdateTransactionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn("Unauthorized transaction update attempt");
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateTransactionSchema.parse(data);

    // Verify transaction belongs to user's business
    const transaction = await db.transaction.findFirst({
      where: buildTransactionPermissionWhere(
        validatedData.transactionId,
        session.user.id,
        false
      ),
    });

    if (!transaction) {
      logger.warn(`Transaction ${validatedData.transactionId} not found or access denied for user ${session.user.id}`);
      return { success: false, error: getPermissionErrorMessage("update") };
    }

    // Update transaction
    const updated = await db.transaction.update({
      where: { id: validatedData.transactionId },
      data: {
        description: validatedData.description,
        amount: validatedData.amount,
        date: validatedData.date,
        notes: validatedData.notes,
        updatedAt: new Date(),
      },
      include: {
        category: true,
        bankAccount: true,
      },
    });

    logger.info(`Transaction ${validatedData.transactionId} updated by user ${session.user.id}`);

    // Transform to match Transaction type
    const transformedTransaction = transformPrismaTransaction(updated);
    return { success: true, data: transformedTransaction };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Invalid transaction data:", error.errors);
      return { success: false, error: "Invalid transaction data provided" };
    }
    
    logger.error("Error updating transaction:", error);
    return { success: false, error: "An error occurred while updating the transaction" };
  }
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(transactionId: string): Promise<DeleteTransactionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn("Unauthorized transaction delete attempt");
      return { success: false, error: "Unauthorized" };
    }

    // Verify transaction belongs to user's business with full access
    const transaction = await db.transaction.findFirst({
      where: buildTransactionPermissionWhere(
        transactionId,
        session.user.id,
        true // Require full access for deletion
      ),
      include: {
        journalEntries: true,
      },
    });

    if (!transaction) {
      logger.warn(`Transaction ${transactionId} not found or access denied for deletion by user ${session.user.id}`);
      return { success: false, error: getPermissionErrorMessage("delete") };
    }

    // Delete in a transaction to ensure data consistency
    await db.$transaction(async (tx) => {
      // Delete journal entries first
      if (transaction.journalEntries.length > 0) {
        await tx.journalEntry.deleteMany({
          where: { transactionId },
        });
      }

      // Delete the transaction
      await tx.transaction.delete({
        where: { id: transactionId },
      });
    });

    logger.info(`Transaction ${transactionId} deleted by user ${session.user.id}`);
    return { success: true, data: { message: "Transaction deleted successfully" } };
  } catch (error) {
    logger.error("Error deleting transaction:", error);
    return { success: false, error: "An error occurred while deleting the transaction" };
  }
}

/**
 * Update transaction category
 */
export async function updateTransactionCategory(data: UpdateCategoryData): Promise<UpdateTransactionCategoryResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn("Unauthorized category update attempt");
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateCategorySchema.parse(data);

    // Use transaction to ensure consistency
    const result = await db.$transaction(async (tx) => {
      // Verify transaction belongs to user's business
      const transaction = await tx.transaction.findFirst({
        where: buildTransactionPermissionWhere(
          validatedData.transactionId,
          session.user.id,
          false
        ),
      });

      if (!transaction) {
        throw new Error("PERMISSION_DENIED");
      }

      // Verify category exists and belongs to the same business
      const category = await tx.category.findFirst({
        where: {
          id: validatedData.categoryId,
          businessId: transaction.businessId,
        },
      });

      if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
      }

      // Update transaction category
      return await tx.transaction.update({
        where: { id: validatedData.transactionId },
        data: {
          categoryId: validatedData.categoryId,
          updatedAt: new Date(),
        },
        include: {
          category: true,
          bankAccount: true,
        },
      });
    });

    logger.info(`Transaction ${validatedData.transactionId} category updated to ${validatedData.categoryId} by user ${session.user.id}`);
    
    const transformedTransaction = transformPrismaTransaction(result);
    return { success: true, data: transformedTransaction };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Invalid category data:", error.errors);
      return { success: false, error: "Invalid data provided" };
    }
    
    if (error instanceof Error) {
      if (error.message === "PERMISSION_DENIED") {
        logger.warn(`Category update denied for transaction ${data.transactionId}`);
        return { success: false, error: getPermissionErrorMessage("categorize") };
      }
      if (error.message === "CATEGORY_NOT_FOUND") {
        return { success: false, error: "Category not found or doesn't belong to this business" };
      }
    }
    
    logger.error("Error updating transaction category:", error);
    return { success: false, error: "An error occurred while updating the category" };
  }
}

/**
 * Toggle transaction reconciliation status
 */
export async function toggleTransactionReconciliation(data: UpdateReconciliationData): Promise<ToggleTransactionReconciliationResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn("Unauthorized reconciliation update attempt");
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
      logger.warn(`Reconciliation denied for transaction ${validatedData.transactionId} by user ${session.user.id}`);
      return { success: false, error: getPermissionErrorMessage("reconcile") };
    }

    // Update reconciliation status
    const updated = await db.transaction.update({
      where: { id: validatedData.transactionId },
      data: {
        isReconciled: validatedData.isReconciled,
        updatedAt: new Date(),
      },
      include: {
        category: true,
        bankAccount: true,
      },
    });

    logger.info(`Transaction ${validatedData.transactionId} reconciliation set to ${validatedData.isReconciled} by user ${session.user.id}`);

    const transformedTransaction = transformPrismaTransaction(updated);
    return { success: true, data: transformedTransaction };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Invalid reconciliation data:", error.errors);
      return { success: false, error: "Invalid data provided" };
    }
    
    logger.error("Error updating reconciliation status:", error);
    return { success: false, error: "An error occurred while updating reconciliation status" };
  }
}


/**
 * Get categories for a business
 * 
 * Note: Categories are relatively static and ideal for caching.
 * Consider implementing React Query or Next.js unstable_cache for production:
 * - Client-side: React Query with 5-10 minute stale time
 * - Server-side: Next.js unstable_cache with revalidation tags
 * - Invalidate on category create/update/delete operations
 */
export async function getBusinessCategories(): Promise<GetBusinessCategoriesResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn("Unauthorized categories fetch attempt");
      return { success: false, error: "Unauthorized" };
    }

    // Find user's business efficiently with a single query
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
      select: { id: true },
    });

    if (!business) {
      logger.warn(`No business found for user ${session.user.id}`);
      return { success: false, error: "No active business found" };
    }

    // Get categories for the business
    const categories = await db.category.findMany({
      where: {
        businessId: business.id,
        isActive: true,
      },
      orderBy: [
        { accountType: "asc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

    logger.debug(`Fetched ${categories.length} categories for business ${business.id}`);

    return { success: true, data: { categories } };
  } catch (error) {
    logger.error("Error fetching categories:", error);
    return { success: false, error: "An error occurred while fetching categories" };
  }
}