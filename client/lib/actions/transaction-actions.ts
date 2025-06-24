"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { transformPrismaTransaction } from "@/lib/utils/transaction-transformers";
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
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateTransactionSchema.parse(data);

    // Verify transaction belongs to user's business
    const transaction = await db.transaction.findFirst({
      where: {
        id: validatedData.transactionId,
        business: {
          members: {
            some: {
              userId: session.user.id,
              accessLevel: {
                in: ["FULL_MANAGEMENT", "FINANCIAL_ONLY"],
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found or access denied" };
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

    // Transform to match Transaction type
    const transformedTransaction = transformPrismaTransaction(updated);
    return { success: true, data: transformedTransaction };
  } catch (error) {
    console.error("Error updating transaction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid transaction data" };
    }
    return { success: false, error: "Failed to update transaction" };
  }
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(transactionId: string): Promise<DeleteTransactionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify transaction belongs to user's business with full access
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
        business: {
          members: {
            some: {
              userId: session.user.id,
              accessLevel: "FULL_MANAGEMENT",
            },
          },
        },
      },
      include: {
        journalEntries: true,
      },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found or access denied" };
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

    return { success: true, data: { message: "Transaction deleted successfully" } };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { success: false, error: "Failed to delete transaction" };
  }
}

/**
 * Update transaction category
 */
export async function updateTransactionCategory(data: UpdateCategoryData): Promise<UpdateTransactionCategoryResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateCategorySchema.parse(data);

    // Verify transaction and category belong to user's business
    const transaction = await db.transaction.findFirst({
      where: {
        id: validatedData.transactionId,
        business: {
          members: {
            some: {
              userId: session.user.id,
              accessLevel: {
                in: ["FULL_MANAGEMENT", "FINANCIAL_ONLY"],
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found or access denied" };
    }

    // Verify category exists and belongs to the same business
    const category = await db.category.findFirst({
      where: {
        id: validatedData.categoryId,
        businessId: transaction.businessId,
      },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    // Update transaction category
    const updated = await db.transaction.update({
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

    const transformedTransaction = transformPrismaTransaction(updated);
    return { success: true, data: transformedTransaction };
  } catch (error) {
    console.error("Error updating transaction category:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid data" };
    }
    return { success: false, error: "Failed to update category" };
  }
}

/**
 * Toggle transaction reconciliation status
 */
export async function toggleTransactionReconciliation(data: UpdateReconciliationData): Promise<ToggleTransactionReconciliationResponse> {
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
        business: {
          members: {
            some: {
              userId: session.user.id,
              accessLevel: {
                in: ["FULL_MANAGEMENT", "FINANCIAL_ONLY"],
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found or access denied" };
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

    const transformedTransaction = transformPrismaTransaction(updated);
    return { success: true, data: transformedTransaction };
  } catch (error) {
    console.error("Error updating reconciliation status:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid data" };
    }
    return { success: false, error: "Failed to update reconciliation status" };
  }
}


/**
 * Get categories for a business
 */
export async function getBusinessCategories(): Promise<GetBusinessCategoriesResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's current business context
    const businessMember = await db.businessMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        business: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!businessMember) {
      return { success: false, error: "No active business found" };
    }

    // Get categories for the business
    const categories = await db.category.findMany({
      where: {
        businessId: businessMember.businessId,
        isActive: true,
      },
      orderBy: [
        { accountType: "asc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

    return { success: true, data: { categories } };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, error: "Failed to fetch categories" };
  }
}