/**
 * Business context validation utilities for server actions
 * 
 * These utilities ensure that multi-business operations are properly validated,
 * especially important for accountants managing multiple client businesses.
 * 
 * In the MVP version, all members have full access to business data.
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "./logger";

export interface BusinessContextValidation {
  isValid: boolean;
  businessId?: string;
  permissions?: {
    canViewFinancials: boolean;
    canManageFinancials: boolean;
    canViewDocuments: boolean;
    canManageDocuments: boolean;
    canManageSettings: boolean;
  };
  error?: string;
}

/**
 * Validates that the user has access to the specified business
 * and returns their permissions for that business.
 * 
 * This is crucial for multi-business scenarios where accountants
 * can switch between different client businesses.
 * 
 * In MVP: All members have full access, so all permissions are true.
 */
export async function validateBusinessContext(
  businessId: string
): Promise<BusinessContextValidation> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { isValid: false, error: "Unauthorized" };
    }

    // Check if user owns or is a member of the business
    const business = await db.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!business) {
      logger.warn(`Business context validation failed: User ${session.user.id} attempted to access business ${businessId}`);
      return { isValid: false, error: "Business not found or access denied" };
    }

    // MVP: All members have full permissions
    const permissions = {
      canViewFinancials: true,
      canManageFinancials: true,
      canViewDocuments: true,
      canManageDocuments: true,
      canManageSettings: true,
    };

    // In MVP, all permission checks pass since everyone has full access

    return {
      isValid: true,
      businessId: business.id,
      permissions,
    };
  } catch (error) {
    logger.error("Business context validation error:", error);
    return { isValid: false, error: "Failed to validate business context" };
  }
}

/**
 * Gets the business ID from various sources in order of preference:
 * 1. Explicitly provided businessId
 * 2. From a transaction or other entity that has a businessId
 * 3. User's default business (for business owners)
 * 
 * This helps ensure consistent business context across operations.
 */
export async function resolveBusinessId(
  explicitBusinessId?: string,
  entityWithBusinessId?: { businessId: string }
): Promise<string | null> {
  // Prefer explicit business ID
  if (explicitBusinessId) {
    return explicitBusinessId;
  }

  // Use entity's business ID if available
  if (entityWithBusinessId?.businessId) {
    return entityWithBusinessId.businessId;
  }

  // Fall back to user's default business
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    return business?.id || null;
  } catch (error) {
    logger.error("Failed to resolve business ID:", error);
    return null;
  }
}