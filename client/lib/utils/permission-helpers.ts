/**
 * Permission helper utilities for transaction operations
 */

import { PERMISSION_LEVELS } from "@/lib/types/transaction-operations";
import type { Prisma } from "@/generated/prisma";

/**
 * Build a Prisma where clause for checking transaction permissions
 */
export function buildTransactionPermissionWhere(
  transactionId: string,
  userId: string,
  requireFullAccess: boolean = false
): Prisma.TransactionWhereInput {
  const memberPermissions = requireFullAccess
    ? [
        { role: PERMISSION_LEVELS.BUSINESS_OWNER },
        { accessLevel: PERMISSION_LEVELS.FULL_MANAGEMENT },
      ]
    : [
        { role: PERMISSION_LEVELS.BUSINESS_OWNER },
        { role: PERMISSION_LEVELS.ACCOUNTANT },
        { accessLevel: { in: [PERMISSION_LEVELS.FULL_MANAGEMENT, PERMISSION_LEVELS.FINANCIAL_ONLY] } },
      ];

  return {
    id: transactionId,
    OR: [
      // Check if user is the business owner
      { business: { ownerId: userId } },
      // Check if user is a member with permissions
      {
        business: {
          members: {
            some: {
              userId: userId,
              OR: memberPermissions,
            },
          },
        },
      },
    ],
  };
}

/**
 * Build a Prisma where clause for finding user's business
 * This handles both owned businesses and member businesses efficiently
 */
export function buildUserBusinessWhere(userId: string): Prisma.BusinessWhereInput {
  return {
    OR: [
      { ownerId: userId },
      {
        members: {
          some: {
            userId: userId,
            OR: [
              { role: { in: [PERMISSION_LEVELS.BUSINESS_OWNER, PERMISSION_LEVELS.ACCOUNTANT] } },
              { accessLevel: { not: PERMISSION_LEVELS.VIEW_ONLY } },
            ],
          },
        },
      },
    ],
  };
}

/**
 * Get a user-friendly error message based on the operation
 */
export function getPermissionErrorMessage(operation: string): string {
  const messages: Record<string, string> = {
    update: "You don't have permission to update this transaction",
    delete: "You don't have permission to delete this transaction",
    categorize: "You don't have permission to categorize this transaction",
    reconcile: "You don't have permission to reconcile this transaction",
    view: "You don't have permission to view this transaction",
  };

  return messages[operation] || "You don't have permission to perform this action";
}