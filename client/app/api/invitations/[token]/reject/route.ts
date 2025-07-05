import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    const resolvedParams = await params;
    token = resolvedParams.token;

    // Validate token format
    if (!token || token.length < 20) {
      return NextResponse.json(
        { error: "Invalid invitation token format" },
        { status: 400, headers: responseHeaders }
      );
    }

    // Find the invitation
    const invitation = await db.teamInvitation.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404, headers: responseHeaders }
      );
    }

    // Check expiration
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

    // Update invitation status to rejected
    await db.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({
      success: true,
      message: "Invitation rejected successfully",
    }, { headers: responseHeaders });
  } catch (error) {
    console.error("[Reject Invitation API] Error:", {
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