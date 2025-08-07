/**
 * Server actions for managing business context and multi-tenant functionality.
 * 
 * These actions handle business selection, permission checking, and context
 * switching for users who may have access to multiple businesses.
 */

"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BusinessAccessLevel, MVP_PERMISSIONS } from "@/lib/types/business-access";
import {
  type UserBusiness,
  type GetUserBusinessesResponse,
  type GetBusinessDetailsResponse,
  type BusinessContextResponse,
  BUSINESS_CONTEXT_ERROR_MESSAGES,
} from "@/lib/types/business-context";
import { logger } from "@/lib/utils/logger";

/**
 * Get all businesses the current user has access to.
 * 
 * This function retrieves all businesses where the user is either an owner
 * or a member. It includes permission information for each business.
 * 
 * @returns Promise resolving to the list of accessible businesses
 */
export async function getUserBusinesses(): Promise<GetUserBusinessesResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: BUSINESS_CONTEXT_ERROR_MESSAGES.unauthorized };
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    let businesses: UserBusiness[] = [];

    if (userRole === "BUSINESS_OWNER") {
      // Business owners can only access their own business
      const ownedBusiness = await db.business.findFirst({
        where: { ownerId: userId },
        select: {
          id: true,
          name: true,
        },
      });

      if (ownedBusiness) {
        businesses = [{
          id: ownedBusiness.id,
          name: ownedBusiness.name,
          role: "BUSINESS_OWNER",
          accessLevel: BusinessAccessLevel.FULL_MANAGEMENT,
          isOwner: true,
          permissions: { ...MVP_PERMISSIONS },
        }];
      }
    } else if (userRole === "ACCOUNTANT") {
      // Accountants can access businesses where they are members
      const businessMembers = await db.businessMember.findMany({
        where: { userId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      businesses = businessMembers.map(member => ({
        id: member.business.id,
        name: member.business.name,
        role: member.role,
        accessLevel: BusinessAccessLevel.FULL_MANAGEMENT, // MVP: All members have full access
        isOwner: false,
        permissions: { ...MVP_PERMISSIONS },
      }));

      // Also include any businesses they own (accountants can also be business owners)
      const ownedBusinesses = await db.business.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          name: true,
        },
      });

      ownedBusinesses.forEach(business => {
        // Only add if not already in the list
        if (!businesses.find(b => b.id === business.id)) {
          businesses.push({
            id: business.id,
            name: business.name,
            role: "BUSINESS_OWNER",
            accessLevel: BusinessAccessLevel.FULL_MANAGEMENT,
            isOwner: true,
            permissions: { ...MVP_PERMISSIONS },
          });
        }
      });
    }

    logger.debug(`Retrieved ${businesses.length} businesses for user ${userId}`);
    return { success: true, businesses };
  } catch (error) {
    logger.error("Error getting user businesses:", error);
    return { success: false, error: BUSINESS_CONTEXT_ERROR_MESSAGES.serverError };
  }
}

/**
 * Get detailed information about a specific business.
 * 
 * This function verifies the user has access to the business before
 * returning its details.
 * 
 * @param businessId - The ID of the business to retrieve
 * @returns Promise resolving to the business details
 */
export async function getBusinessDetails(businessId: string): Promise<GetBusinessDetailsResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: BUSINESS_CONTEXT_ERROR_MESSAGES.unauthorized };
    }

    // Verify user has access to this business
    const userBusinesses = await getUserBusinesses();
    if (!userBusinesses.success || !userBusinesses.businesses) {
      return { success: false, error: BUSINESS_CONTEXT_ERROR_MESSAGES.serverError };
    }

    const hasAccess = userBusinesses.businesses.some(b => b.id === businessId);
    if (!hasAccess) {
      logger.warn(`User ${session.user.id} attempted to access business ${businessId} without permission`);
      return { success: false, error: BUSINESS_CONTEXT_ERROR_MESSAGES.permissionDenied };
    }

    const business = await db.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (!business) {
      return { success: false, error: BUSINESS_CONTEXT_ERROR_MESSAGES.businessNotFound };
    }

    return { success: true, business };
  } catch (error) {
    logger.error("Error getting business details:", error);
    return { success: false, error: BUSINESS_CONTEXT_ERROR_MESSAGES.serverError };
  }
}

/**
 * Get the current business ID for the user.
 * 
 * For business owners, returns their owned business.
 * For accountants, reads from cookie or returns the first business they have access to.
 * 
 * @returns Promise resolving to the current business ID or null
 */
export async function getCurrentBusinessId(): Promise<string | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    if (userRole === "BUSINESS_OWNER") {
      // Business owners have only one business
      const business = await db.business.findFirst({
        where: { ownerId: userId },
        select: { id: true },
      });
      return business?.id || null;
    } else if (userRole === "ACCOUNTANT") {
      // Try to read from cookies first
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const selectedBusinessId = cookieStore.get("selectedBusinessId")?.value;
      
      if (selectedBusinessId) {
        // Verify the user still has access to this business
        const hasAccess = await db.businessMember.findFirst({
          where: { 
            userId,
            businessId: selectedBusinessId
          },
        });
        
        if (hasAccess) {
          return selectedBusinessId;
        }
      }
      
      // Fall back to the most recent business
      const membership = await db.businessMember.findFirst({
        where: { userId },
        select: { businessId: true },
        orderBy: { joinedAt: "desc" },
      });
      
      if (membership) {
        return membership.businessId;
      }
      
      // Check if they own any businesses
      const ownedBusiness = await db.business.findFirst({
        where: { ownerId: userId },
        select: { id: true },
      });
      
      return ownedBusiness?.id || null;
    }

    return null;
  } catch (error) {
    logger.error("Error getting current business ID:", error);
    return null;
  }
}

/**
 * Set the selected business ID for the current user.
 * 
 * This function verifies the user has access to the business before
 * setting it as their current context. The selection is persisted
 * in a cookie for future requests.
 * 
 * @param businessId - The ID of the business to select
 * @returns Promise resolving to the operation result
 */
export async function setSelectedBusinessId(businessId: string): Promise<BusinessContextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: BUSINESS_CONTEXT_ERROR_MESSAGES.unauthorized };
    }

    const userId = session.user.id;
    
    // Verify user has access to this business
    const hasAccess = await db.businessMember.findFirst({
      where: { 
        userId,
        businessId
      },
    });
    
    const isOwner = await db.business.findFirst({
      where: {
        id: businessId,
        ownerId: userId
      }
    });
    
    if (!hasAccess && !isOwner) {
      logger.warn(`User ${userId} attempted to select business ${businessId} without access`);
      return { success: false, error: BUSINESS_CONTEXT_ERROR_MESSAGES.permissionDenied };
    }
    
    // Set cookie
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("selectedBusinessId", businessId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    
    logger.info(`User ${userId} selected business ${businessId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error setting selected business ID:", error);
    return { success: false, error: BUSINESS_CONTEXT_ERROR_MESSAGES.serverError };
  }
}