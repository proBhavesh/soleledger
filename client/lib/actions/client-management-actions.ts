"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import React from "react";
import { sendEmail } from "@/lib/email/resend";
import {
  NewUserInvitationEmail,
  ExistingUserNoBusinessEmail,
  ExistingUserWithBusinessEmail,
} from "@/lib/email/templates";
import {
  createClientInvitationSchema,
  type CreateClientInvitationData,
  type CreateClientInvitationResponse,
  type GetInvitationsResponse,
  type ResendInvitationResponse,
  type CancelInvitationResponse,
  type InvitationType,
} from "@/lib/types/invitation";
import type { BusinessAccessLevel } from "@/generated/prisma";
import { z } from "zod";

/**
 * Create an invitation for a client (handles all three scenarios)
 */
export async function createClientInvitation(
  data: CreateClientInvitationData
): Promise<CreateClientInvitationResponse> {
  let session;
  
  try {
    session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Only accountants can create client invitations
    if (session.user.role !== "ACCOUNTANT") {
      return { success: false, error: "Only accountants can create client invitations" };
    }

    const validatedData = createClientInvitationSchema.parse(data);
    const accountantId = session.user.id;

    // Check if a user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
      include: {
        businesses: true,
      },
    });

    let invitationType: InvitationType;
    let businessId: string | null = null;

    if (!existingUser) {
      // Scenario 1: New user
      invitationType = "NEW_USER";
    } else if (existingUser.businesses.length === 0) {
      // Scenario 2: Existing user without business
      invitationType = "EXISTING_NO_BUSINESS";
    } else {
      // Scenario 3: Existing user with business
      invitationType = "EXISTING_WITH_BUSINESS";
      businessId = existingUser.businesses[0].id;

      // Check if accountant already has access
      const existingMembership = await db.businessMember.findFirst({
        where: {
          businessId,
          userId: accountantId,
        },
      });

      if (existingMembership) {
        return { success: false, error: "You already have access to this client's business" };
      }
    }

    // Create the invitation record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await db.teamInvitation.create({
      data: {
        email: validatedData.email,
        businessId,
        businessName: businessId ? undefined : validatedData.businessName,
        clientName: validatedData.clientName,
        status: "PENDING",
        role: "BUSINESS_OWNER",
        senderId: accountantId,
        receiverId: existingUser?.id,
        expiresAt,
        invitationType,
        accessLevel: validatedData.accessLevel as BusinessAccessLevel,
      },
      include: {
        sender: true,
        business: true,
      },
    });

    // Send email if requested
    if (validatedData.sendNotification) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const invitationUrl = `${baseUrl}/invite/${invitation.token}`;
      const formattedExpiry = expiresAt.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      let emailComponent: React.ReactElement | null = null;

      switch (invitationType) {
        case "NEW_USER":
          emailComponent = NewUserInvitationEmail({
            accountantName: invitation.sender.name || invitation.sender.email || "Your accountant",
            clientName: validatedData.clientName,
            businessName: validatedData.businessName,
            invitationUrl,
            expiresAt: formattedExpiry,
          });
          break;

        case "EXISTING_NO_BUSINESS":
          emailComponent = ExistingUserNoBusinessEmail({
            accountantName: invitation.sender.name || invitation.sender.email || "Your accountant",
            clientName: validatedData.clientName,
            businessName: validatedData.businessName,
            invitationUrl,
            expiresAt: formattedExpiry,
          });
          break;

        case "EXISTING_WITH_BUSINESS":
          emailComponent = ExistingUserWithBusinessEmail({
            accountantName: invitation.sender.name || invitation.sender.email || "Your accountant",
            accountantEmail: invitation.sender.email || "",
            clientName: validatedData.clientName,
            businessName: invitation.business?.name || validatedData.businessName,
            invitationUrl,
            expiresAt: formattedExpiry,
          });
          break;
      }

      const emailResult = await sendEmail({
        to: validatedData.email,
        subject: getEmailSubject(invitationType, invitation.sender.name || "Your accountant"),
        react: emailComponent || undefined,
      });

      if (!emailResult.success) {
        console.error("[createClientInvitation] Failed to send email:", {
          email: validatedData.email,
          invitationType,
          error: emailResult.error,
        });
        // Continue even if email fails - invitation is still created
      }
    }

    return { 
      success: true, 
      invitationId: invitation.id,
      invitationType,
    };
  } catch (error) {
    console.error("[createClientInvitation] Error:", {
      error,
      userId: session?.user?.id,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { 
        success: false, 
        error: `Invalid data: ${firstError.path.join(".")} - ${firstError.message}` 
      };
    }
    
    if (error instanceof Error) {
      if (error.message.includes("unique constraint")) {
        return { success: false, error: "An invitation for this client already exists" };
      }
      if (error.message.includes("prisma")) {
        return { success: false, error: "Database error. Please try again." };
      }
    }
    
    return { success: false, error: "Failed to create invitation. Please try again." };
  }
}

/**
 * Get email subject based on invitation type
 */
function getEmailSubject(type: InvitationType, accountantName: string): string {
  switch (type) {
    case "NEW_USER":
      return `${accountantName} has invited you to SoleLedger`;
    case "EXISTING_NO_BUSINESS":
      return `${accountantName} is ready to manage your bookkeeping`;
    case "EXISTING_WITH_BUSINESS":
      return `${accountantName} requested access to your business`;
    default:
      return "Invitation to SoleLedger";
  }
}

/**
 * Get pending invitations for the current accountant
 */
export async function getAccountantInvitations(): Promise<GetInvitationsResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized - Please sign in" };
    }

    if (session.user.role !== "ACCOUNTANT") {
      return { success: false, error: "Only accountants can view invitations" };
    }

    const invitations = await db.teamInvitation.findMany({
      where: {
        senderId: session.user.id,
      },
      include: {
        receiver: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { 
      success: true, 
      invitations: invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        invitationType: inv.invitationType,
        businessName: inv.businessName || undefined,
        clientName: inv.clientName || undefined,
        accessLevel: inv.accessLevel,
        createdAt: inv.createdAt.toISOString(),
        expiresAt: inv.expiresAt.toISOString(),
        receiver: inv.receiver ? {
          id: inv.receiver.id,
          email: inv.receiver.email,
          name: inv.receiver.name || undefined,
        } : undefined,
        business: inv.business ? {
          name: inv.business.name,
        } : undefined,
      }))
    };
  } catch (error) {
    console.error("[getAccountantInvitations] Error:", error);
    return { success: false, error: "Failed to fetch invitations" };
  }
}

/**
 * Resend an invitation
 */
export async function resendInvitation(invitationId: string): Promise<ResendInvitationResponse> {
  let session;
  
  try {
    session = await auth();
    if (!session?.user?.id || session.user.role !== "ACCOUNTANT") {
      return { success: false, error: "Unauthorized" };
    }

    const invitation = await db.teamInvitation.findFirst({
      where: {
        id: invitationId,
        senderId: session.user.id,
        status: "PENDING",
      },
      include: {
        sender: true,
        business: true,
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found or already processed" };
    }

    // Update expiry date
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await db.teamInvitation.update({
      where: { id: invitationId },
      data: { expiresAt: newExpiresAt },
    });

    // Resend email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const invitationUrl = `${baseUrl}/invite/${invitation.token}`;
    const formattedExpiry = newExpiresAt.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let emailComponent: React.ReactElement | null = null;

    switch (invitation.invitationType) {
      case "NEW_USER":
        emailComponent = NewUserInvitationEmail({
          accountantName: invitation.sender.name || invitation.sender.email || "Your accountant",
          clientName: invitation.clientName || invitation.email,
          businessName: invitation.businessName || "",
          invitationUrl,
          expiresAt: formattedExpiry,
        });
        break;

      case "EXISTING_NO_BUSINESS":
        emailComponent = ExistingUserNoBusinessEmail({
          accountantName: invitation.sender.name || invitation.sender.email || "Your accountant",
          clientName: invitation.clientName || invitation.email,
          businessName: invitation.businessName || "",
          invitationUrl,
          expiresAt: formattedExpiry,
        });
        break;

      case "EXISTING_WITH_BUSINESS":
        emailComponent = ExistingUserWithBusinessEmail({
          accountantName: invitation.sender.name || invitation.sender.email || "Your accountant",
          accountantEmail: invitation.sender.email || "",
          clientName: invitation.clientName || invitation.email,
          businessName: invitation.business?.name || invitation.businessName || "",
          invitationUrl,
          expiresAt: formattedExpiry,
        });
        break;
    }

    const emailResult = await sendEmail({
      to: invitation.email,
      subject: getEmailSubject(
        invitation.invitationType,
        invitation.sender.name || "Your accountant"
      ),
      react: emailComponent || undefined,
    });

    if (!emailResult.success) {
      console.error("[resendInvitation] Failed to send email:", {
        invitationId,
        email: invitation.email,
        error: emailResult.error,
      });
      return { success: false, error: "Failed to send email. Please try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("[resendInvitation] Error:", {
      error,
      invitationId,
      userId: session?.user?.id,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    
    if (error instanceof Error && error.message.includes("prisma")) {
      return { success: false, error: "Database error. Please try again." };
    }
    
    return { success: false, error: "Failed to resend invitation. Please try again." };
  }
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(invitationId: string): Promise<CancelInvitationResponse> {
  let session;
  
  try {
    session = await auth();
    if (!session?.user?.id || session.user.role !== "ACCOUNTANT") {
      return { success: false, error: "Unauthorized" };
    }

    const invitation = await db.teamInvitation.findFirst({
      where: {
        id: invitationId,
        senderId: session.user.id,
        status: "PENDING",
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found or already processed" };
    }

    await db.teamInvitation.update({
      where: { id: invitationId },
      data: { status: "REJECTED" },
    });

    return { success: true };
  } catch (error) {
    console.error("[cancelInvitation] Error:", {
      error,
      invitationId,
      userId: session?.user?.id,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    
    if (error instanceof Error && error.message.includes("prisma")) {
      return { success: false, error: "Database error. Please try again." };
    }
    
    return { success: false, error: "Failed to cancel invitation. Please try again." };
  }
}