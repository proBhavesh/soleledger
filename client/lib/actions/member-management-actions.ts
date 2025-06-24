"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { 
  inviteMemberSchema, 
  type InviteMemberData, 
  type InviteMemberResponse,
  type BusinessMemberWithUser,
  BusinessAccessLevel 
} from "@/lib/types/business-access";

/**
 * Invite a member to a business (client invites accountant)
 */
export async function inviteMemberToBusiness(
  businessId: string,
  data: InviteMemberData
): Promise<InviteMemberResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedData = inviteMemberSchema.parse(data);

    // Verify the user owns this business
    const business = await db.business.findFirst({
      where: {
        id: businessId,
        ownerId: session.user.id
      }
    });

    if (!business) {
      return { success: false, error: "Business not found or you don't have permission" };
    }

    // Check if user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email }
    });

    // Check if there's already a member relationship
    if (existingUser) {
      const existingMember = await db.businessMember.findFirst({
        where: {
          businessId,
          userId: existingUser.id
        }
      });

      if (existingMember) {
        return { success: false, error: "This user is already a member of your business" };
      }
    }

    // Create or update invitation
    const invitation = await db.teamInvitation.upsert({
      where: {
        email_businessId: {
          email: validatedData.email,
          businessId
        }
      },
      update: {
        status: "PENDING",
        role: "ACCOUNTANT",
        senderId: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        updatedAt: new Date()
      },
      create: {
        businessId,
        email: validatedData.email,
        status: "PENDING",
        role: "ACCOUNTANT",
        senderId: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // If user exists, create the business member relationship immediately
    if (existingUser) {
      await db.businessMember.create({
        data: {
          businessId,
          userId: existingUser.id,
          role: "ACCOUNTANT",
          accessLevel: validatedData.accessLevel,
          invitedBy: session.user.id,
          invitedAt: new Date(),
          joinedAt: new Date() // Auto-join since user already exists
        }
      });

      // Update invitation status
      await db.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          receiverId: existingUser.id
        }
      });
    }

    // TODO: Send invitation email with setup instructions
    console.log(`[INVITATION] Business owner ${session.user.email} invited ${validatedData.email} to business "${business.name}" with ${validatedData.accessLevel} access`);

    return { success: true, invitationId: invitation.id };
  } catch (error) {
    console.error("Error inviting member:", error);
    return { success: false, error: "Failed to send invitation" };
  }
}

/**
 * Get all members of a business
 */
export async function getBusinessMembers(businessId: string): Promise<{
  success: boolean;
  members?: BusinessMemberWithUser[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user has access to this business
    const hasAccess = await db.businessMember.findFirst({
      where: {
        businessId,
        userId: session.user.id
      }
    }) || await db.business.findFirst({
      where: {
        id: businessId,
        ownerId: session.user.id
      }
    });

    if (!hasAccess) {
      return { success: false, error: "You don't have access to this business" };
    }

    const members = await db.businessMember.findMany({
      where: { businessId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, members: members as BusinessMemberWithUser[] };
  } catch (error) {
    console.error("Error getting business members:", error);
    return { success: false, error: "Failed to get members" };
  }
}

/**
 * Update member access level
 */
export async function updateMemberAccess(
  businessId: string,
  memberId: string,
  accessLevel: BusinessAccessLevel
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify the user owns this business
    const business = await db.business.findFirst({
      where: {
        id: businessId,
        ownerId: session.user.id
      }
    });

    if (!business) {
      return { success: false, error: "Only business owners can update member access" };
    }

    await db.businessMember.update({
      where: { id: memberId },
      data: { accessLevel }
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating member access:", error);
    return { success: false, error: "Failed to update access level" };
  }
}

/**
 * Remove member from business
 */
export async function removeMemberFromBusiness(
  businessId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify the user owns this business
    const business = await db.business.findFirst({
      where: {
        id: businessId,
        ownerId: session.user.id
      }
    });

    if (!business) {
      return { success: false, error: "Only business owners can remove members" };
    }

    await db.businessMember.delete({
      where: { id: memberId }
    });

    return { success: true };
  } catch (error) {
    console.error("Error removing member:", error);
    return { success: false, error: "Failed to remove member" };
  }
}