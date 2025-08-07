/**
 * Permission helper utilities for transaction and business operations.
 * 
 * These utilities provide Prisma where clauses for permission-based queries.
 * In the MVP version, all team members have full access, but the structure
 * is maintained to allow easy extension when granular permissions are added.
 */

import type { Prisma } from "@/generated/prisma";

/**
 * Build a Prisma where clause for checking transaction permissions.
 * 
 * This function creates a database query filter that ensures the user
 * has permission to access a specific transaction. In the MVP, all
 * business members have full access.
 * 
 * @param transactionId - The ID of the transaction to check
 * @param userId - The ID of the user requesting access
 * @returns Prisma where clause for the transaction query
 */
export function buildTransactionPermissionWhere(
  transactionId: string,
  userId: string
): Prisma.TransactionWhereInput {
  return {
    id: transactionId,
    OR: [
      // Check if user is the business owner
      { business: { ownerId: userId } },
      // Check if user is a member (all members have full access in MVP)
      {
        business: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      },
    ],
  };
}

/**
 * Build a Prisma where clause for finding businesses accessible to a user.
 * 
 * This function creates a query filter that returns all businesses where
 * the user is either an owner or a member. In the MVP, all members have
 * equal access to business data.
 * 
 * @param userId - The ID of the user to find businesses for
 * @returns Prisma where clause for the business query
 */
export function buildUserBusinessWhere(userId: string): Prisma.BusinessWhereInput {
  return {
    OR: [
      // User owns the business
      { ownerId: userId },
      // User is a member of the business
      {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    ],
  };
}

/**
 * Build a where clause for document access permissions.
 * 
 * @param documentId - The ID of the document to check
 * @param userId - The ID of the user requesting access
 * @returns Prisma where clause for the document query
 */
export function buildDocumentPermissionWhere(
  documentId: string,
  userId: string
): Prisma.DocumentWhereInput {
  return {
    id: documentId,
    OR: [
      // User owns the business
      { business: { ownerId: userId } },
      // User is a member of the business
      {
        business: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      },
    ],
  };
}

/**
 * Build a where clause for bank account access permissions.
 * 
 * @param bankAccountId - The ID of the bank account to check
 * @param userId - The ID of the user requesting access
 * @returns Prisma where clause for the bank account query
 */
export function buildBankAccountPermissionWhere(
  bankAccountId: string,
  userId: string
): Prisma.BankAccountWhereInput {
  return {
    id: bankAccountId,
    OR: [
      // User owns the business
      { business: { ownerId: userId } },
      // User is a member of the business
      {
        business: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      },
    ],
  };
}

/**
 * Permission error messages for different operations.
 * These provide user-friendly feedback when permissions are denied.
 */
const PERMISSION_ERROR_MESSAGES = {
  update: "You don't have permission to update this transaction",
  delete: "You don't have permission to delete this transaction",
  categorize: "You don't have permission to categorize this transaction",
  reconcile: "You don't have permission to reconcile this transaction",
  view: "You don't have permission to view this transaction",
  create: "You don't have permission to create transactions for this business",
  export: "You don't have permission to export data from this business",
  manage: "You don't have permission to manage this resource",
} as const;

/**
 * Get a user-friendly error message for permission denials.
 * 
 * @param operation - The operation that was denied
 * @returns A user-friendly error message
 */
export function getPermissionErrorMessage(
  operation: keyof typeof PERMISSION_ERROR_MESSAGES
): string {
  return PERMISSION_ERROR_MESSAGES[operation] || "You don't have permission to perform this action";
}

/**
 * Check if a user has access to a specific business.
 * 
 * This is a utility function for simple boolean checks without
 * building a full Prisma where clause.
 * 
 * @param userId - The user ID to check
 * @param businessId - The business ID to check
 * @param db - Prisma database client instance
 * @returns Promise resolving to true if the user has access
 */
export async function userHasBusinessAccess(
  userId: string,
  businessId: string,
  db: { 
    business: { 
      findFirst: (args: {
        where: object;
        select: object;
      }) => Promise<{ id: string } | null> 
    } 
  }
): Promise<boolean> {
  const business = await db.business.findFirst({
    where: {
      id: businessId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    },
    select: { id: true },
  });
  
  return !!business;
}