import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { InvitationValidationResponse } from "@/lib/types/invitation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<InvitationValidationResponse | { error: string }>> {
  // Add security headers
  const responseHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  
  let token: string | undefined;
  
  try {
    const resolvedParams = await params;
    token = resolvedParams.token;

    // Validate token format (should be a valid cuid)
    if (!token || token.length < 20) {
      return NextResponse.json(
        { error: "Invalid invitation token format" },
        { status: 400, headers: responseHeaders }
      );
    }

    // Find the invitation by token
    const invitation = await db.teamInvitation.findUnique({
      where: { token },
      include: {
        sender: {
          select: {
            name: true,
            email: true,
          },
        },
        business: {
          select: {
            name: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            name: true,
            authProvider: true, // Include auth provider for existing users
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404, headers: responseHeaders }
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410, headers: responseHeaders }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status.toLowerCase()}` },
        { status: 400, headers: responseHeaders }
      );
    }

    // Return invitation details
    const response: InvitationValidationResponse = {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        clientName: invitation.clientName || invitation.email,
        businessName: invitation.businessName || invitation.business?.name || "",
        invitationType: invitation.invitationType,
        accessLevel: invitation.accessLevel,
        senderName: invitation.sender.name || invitation.sender.email || "Unknown",
        senderEmail: invitation.sender.email || "",
        expiresAt: invitation.expiresAt.toISOString(),
        hasExistingUser: !!invitation.receiver,
        userAuthProvider: invitation.receiver?.authProvider || null,
      },
    };

    return NextResponse.json(response, { headers: responseHeaders });
  } catch (error) {
    console.error("[Invitation Validation API] Error:", {
      error,
      token: token || "unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    
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