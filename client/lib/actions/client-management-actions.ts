"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { 
  createClientBusinessSchema, 
  type CreateClientBusinessResponse,
  type CreateClientBusinessData,
  type SendInvitationResponse 
} from "@/lib/types/client-management";

/**
 * Create a new business for a client and set up the accountant relationship
 */
export async function createClientBusiness(
  data: CreateClientBusinessData
): Promise<CreateClientBusinessResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Only accountants can create client businesses
    if (session.user.role !== "ACCOUNTANT") {
      return { success: false, error: "Only accountants can create client businesses" };
    }

    const validatedData = createClientBusinessSchema.parse(data);
    const accountantId = session.user.id;

    // Check if a user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    let clientUserId: string;

    if (existingUser) {
      // User exists, check if they already have a business
      const existingBusiness = await db.business.findFirst({
        where: { ownerId: existingUser.id },
      });

      if (existingBusiness) {
        // Check if accountant already has access to this business
        const existingMembership = await db.businessMember.findFirst({
          where: {
            businessId: existingBusiness.id,
            userId: accountantId,
          },
        });

        if (existingMembership) {
          return { success: false, error: "You already have access to this client's business" };
        }

        // Add accountant as member to existing business
        await db.businessMember.create({
          data: {
            businessId: existingBusiness.id,
            userId: accountantId,
            role: "ACCOUNTANT",
          },
        });

        return { success: true, businessId: existingBusiness.id };
      }

      clientUserId = existingUser.id;
    } else {
      // Create a new user for the client
      const newUser = await db.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          role: "BUSINESS_OWNER",
          // No password - they'll need to set one when they first log in
        },
      });
      clientUserId = newUser.id;
    }

    // Use a transaction to ensure data consistency
    const result = await db.$transaction(async (prisma) => {
      // Create the business for the client
      const business = await prisma.business.create({
        data: {
          name: validatedData.name,
          ownerId: clientUserId,
        },
      });

      // Add the accountant as a member of the business
      await prisma.businessMember.create({
        data: {
          businessId: business.id,
          userId: accountantId,
          role: "ACCOUNTANT",
        },
      });

      return business;
    });

    return { success: true, businessId: result.id };
  } catch (error) {
    console.error("Error creating client business:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid data provided" };
    }
    return { success: false, error: "Failed to create client business" };
  }
}

/**
 * Send invitation notification to client
 * For now, this creates an invitation record in the database
 * and logs the action. In production, this would trigger email sending.
 */
export async function sendClientInvitation(
  businessId: string,
  email: string,
  businessName: string
): Promise<SendInvitationResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Only accountants can send invitations
    if (session.user.role !== "ACCOUNTANT") {
      return { success: false, error: "Only accountants can send invitations" };
    }

    // Verify the accountant has access to this business
    const businessMember = await db.businessMember.findFirst({
      where: {
        businessId,
        userId: session.user.id,
        role: "ACCOUNTANT",
      },
    });

    if (!businessMember) {
      return { success: false, error: "You don't have access to this business" };
    }

    // For now, just log the invitation
    // In production, this would integrate with an email service
    console.log(`[INVITATION] Accountant ${session.user.email} invited ${email} to business "${businessName}" (ID: ${businessId})`);
    
    // TODO: In production, implement actual email sending here
    // - Generate secure invitation token
    // - Store invitation in database with expiry
    // - Send email with login/signup link
    
    return { success: true };
  } catch (error) {
    console.error("Error sending client invitation:", error);
    return { success: false, error: "Failed to send invitation" };
  }
}