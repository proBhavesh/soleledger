"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { 
  BusinessAccessLevel,
  canViewFinancials,
  canManageFinancials,
  canViewDocuments,
  canManageDocuments,
  canManageSettings
} from "@/lib/types/business-access";

export interface UserBusiness {
  id: string;
  name: string;
  role: string;
  accessLevel?: BusinessAccessLevel;
  isOwner: boolean;
  permissions?: {
    canViewFinancials: boolean;
    canManageFinancials: boolean;
    canViewDocuments: boolean;
    canManageDocuments: boolean;
    canManageSettings: boolean;
  };
}

export interface GetUserBusinessesResponse {
  success: boolean;
  businesses?: UserBusiness[];
  error?: string;
}

/**
 * Get all businesses the current user has access to
 */
export async function getUserBusinesses(): Promise<GetUserBusinessesResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
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
          permissions: {
            canViewFinancials: true,
            canManageFinancials: true,
            canViewDocuments: true,
            canManageDocuments: true,
            canManageSettings: true,
          },
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

      businesses = businessMembers.map(member => {
        const accessLevel = member.accessLevel as BusinessAccessLevel || BusinessAccessLevel.VIEW_ONLY;
        return {
          id: member.business.id,
          name: member.business.name,
          role: member.role,
          accessLevel,
          isOwner: false,
          permissions: {
            canViewFinancials: canViewFinancials(accessLevel),
            canManageFinancials: canManageFinancials(accessLevel),
            canViewDocuments: canViewDocuments(accessLevel),
            canManageDocuments: canManageDocuments(accessLevel),
            canManageSettings: canManageSettings(accessLevel),
          },
        };
      });

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
            permissions: {
              canViewFinancials: true,
              canManageFinancials: true,
              canViewDocuments: true,
              canManageDocuments: true,
              canManageSettings: true,
            },
          });
        }
      });
    }

    return { success: true, businesses };
  } catch (error) {
    console.error("Error getting user businesses:", error);
    return { success: false, error: "Failed to get businesses" };
  }
}

/**
 * Get business details for the current context
 */
export async function getBusinessDetails(businessId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user has access to this business
    const userBusinesses = await getUserBusinesses();
    if (!userBusinesses.success || !userBusinesses.businesses) {
      return { success: false, error: "Failed to verify access" };
    }

    const hasAccess = userBusinesses.businesses.some(b => b.id === businessId);
    if (!hasAccess) {
      return { success: false, error: "Access denied to this business" };
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
      return { success: false, error: "Business not found" };
    }

    return { success: true, business };
  } catch (error) {
    console.error("Error getting business details:", error);
    return { success: false, error: "Failed to get business details" };
  }
}

/**
 * Get the current business ID for the user.
 * For business owners, returns their owned business.
 * For accountants, reads from cookie or returns the first business they have access to.
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
    console.error("Error getting current business ID:", error);
    return null;
  }
}

/**
 * Set the selected business ID in a cookie for accountants
 */
export async function setSelectedBusinessId(businessId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
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
      return { success: false, error: "Access denied to this business" };
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
    
    return { success: true };
  } catch (error) {
    console.error("Error setting selected business ID:", error);
    return { success: false, error: "Failed to set business selection" };
  }
}