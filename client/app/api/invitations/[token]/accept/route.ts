import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { createDefaultChartOfAccounts } from "@/lib/actions/chart-of-accounts-actions";
import { 
  acceptInvitationSchema,
} from "@/lib/types/invitation";
import { AuthProvider, UserRole } from "@/generated/prisma";
import { z } from "zod";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Security headers
  const responseHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  
  let token: string | undefined;
  
  try {
    // Verify content type
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400, headers: responseHeaders }
      );
    }
    
    const resolvedParams = await params;
    token = resolvedParams.token;
    const body = await request.json();

    // Validate input
    const validatedData = acceptInvitationSchema.parse(body);

    // Find the invitation
    const invitation = await db.teamInvitation.findUnique({
      where: { token },
      include: {
        sender: true,
        receiver: true,
        business: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404, headers: responseHeaders }
      );
    }

    // Check expiration and status
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410, headers: responseHeaders }
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status.toLowerCase()}` },
        { status: 400, headers: responseHeaders }
      );
    }

    // Handle based on invitation type
    switch (invitation.invitationType) {
      case "NEW_USER": {
        // Check if using OAuth or password
        const useOAuth = validatedData.authMethod === "oauth";
        
        if (!useOAuth && !validatedData.password) {
          return NextResponse.json(
            { error: "Password is required when not using OAuth" },
            { status: 400, headers: responseHeaders }
          );
        }

        // Create user and business in a transaction
        const result = await db.$transaction(async (tx) => {
          // Create the user
          interface UserCreateData {
            email: string;
            name: string;
            role: UserRole;
            authProvider: AuthProvider;
            emailVerified?: Date;
            hashedPassword?: string;
            emailVerificationToken?: string;
          }
          
          const userData: UserCreateData = {
            email: invitation.email,
            name: invitation.clientName || invitation.email,
            role: UserRole.BUSINESS_OWNER,
            authProvider: useOAuth ? AuthProvider.GOOGLE : AuthProvider.CREDENTIALS,
          };
          
          if (useOAuth) {
            // For OAuth users, mark email as verified since OAuth providers verify emails
            userData.emailVerified = new Date();
          } else {
            // For password users, hash the password but don't auto-verify email
            const hashedPassword = await hash(validatedData.password!, 10);
            userData.hashedPassword = hashedPassword;
            // Generate email verification token for later verification
            const crypto = await import('crypto');
            userData.emailVerificationToken = crypto.randomUUID();
          }
          
          const newUser = await tx.user.create({
            data: userData,
          });

          // Create the business
          const business = await tx.business.create({
            data: {
              name: invitation.businessName!,
              ownerId: newUser.id,
            },
          });

          // Add the accountant as a member
          await tx.businessMember.create({
            data: {
              businessId: business.id,
              userId: invitation.senderId,
              role: "ACCOUNTANT",
              accessLevel: invitation.accessLevel,
              invitedBy: invitation.senderId,
              invitedAt: invitation.createdAt,
              joinedAt: new Date(),
            },
          });

          // Update invitation status
          await tx.teamInvitation.update({
            where: { id: invitation.id },
            data: {
              status: "ACCEPTED",
              receiverId: newUser.id,
            },
          });

          return { userId: newUser.id, businessId: business.id };
        });

        // Create standard chart of accounts for the new business
        await createDefaultChartOfAccounts(result.businessId, result.userId);

        return NextResponse.json({
          success: true,
          message: "Account created successfully",
          redirectTo: useOAuth ? `/login?oauth=true&email=${invitation.email}` : "/login",
          requiresOAuth: useOAuth,
        }, { headers: responseHeaders });
      }

      case "EXISTING_NO_BUSINESS": {
        if (!invitation.receiver) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 400, headers: responseHeaders }
          );
        }

        // Create business and add accountant
        const result = await db.$transaction(async (tx) => {
          // Create the business
          const business = await tx.business.create({
            data: {
              name: invitation.businessName!,
              ownerId: invitation.receiverId!,
            },
          });

          // Add the accountant as a member
          await tx.businessMember.create({
            data: {
              businessId: business.id,
              userId: invitation.senderId,
              role: "ACCOUNTANT",
              accessLevel: invitation.accessLevel,
              invitedBy: invitation.senderId,
              invitedAt: invitation.createdAt,
              joinedAt: new Date(),
            },
          });

          // Update invitation status
          await tx.teamInvitation.update({
            where: { id: invitation.id },
            data: { status: "ACCEPTED" },
          });

          return business.id;
        });

        // Create standard chart of accounts
        await createDefaultChartOfAccounts(result, invitation.receiverId!);

        return NextResponse.json({
          success: true,
          message: "Business created successfully",
          redirectTo: "/dashboard",
        }, { headers: responseHeaders });
      }

      case "EXISTING_WITH_BUSINESS": {
        if (!invitation.business || !invitation.receiver) {
          return NextResponse.json(
            { error: "Business or user not found" },
            { status: 400, headers: responseHeaders }
          );
        }

        // Add accountant to existing business
        await db.$transaction(async (tx) => {
          // Check if membership already exists
          const existingMembership = await tx.businessMember.findFirst({
            where: {
              businessId: invitation.businessId!,
              userId: invitation.senderId,
            },
          });

          if (!existingMembership) {
            // Add the accountant as a member
            await tx.businessMember.create({
              data: {
                businessId: invitation.businessId!,
                userId: invitation.senderId,
                role: "ACCOUNTANT",
                accessLevel: invitation.accessLevel,
                invitedBy: invitation.receiverId,
                invitedAt: invitation.createdAt,
                joinedAt: new Date(),
              },
            });
          }

          // Update invitation status
          await tx.teamInvitation.update({
            where: { id: invitation.id },
            data: { status: "ACCEPTED" },
          });
        });

        return NextResponse.json({
          success: true,
          message: "Access granted successfully",
          redirectTo: "/dashboard",
        }, { headers: responseHeaders });
      }

      default:
        return NextResponse.json(
          { error: "Invalid invitation type" },
          { status: 400, headers: responseHeaders }
        );
    }
  } catch (error) {
    console.error("[Accept Invitation API] Error:", {
      error,
      token: token || "unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid request data", 
          details: error.errors.map(err => ({
            field: err.path.join("."),
            message: err.message,
          }))
        },
        { status: 400, headers: responseHeaders }
      );
    }
    
    if (error instanceof Error && error.message.includes("prisma")) {
      return NextResponse.json(
        { error: "Database operation failed. Please try again." },
        { status: 500, headers: responseHeaders }
      );
    }
    
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500, headers: responseHeaders }
    );
  }
}