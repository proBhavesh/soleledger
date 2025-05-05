import { NextRequest, NextResponse } from "next/server";

/**
 * This endpoint handles the OAuth return flow after a user has authorized their bank account in Plaid
 * 
 * @param req The incoming request
 */
export async function GET(req: NextRequest) {
    try {
        // Extract parameters from the OAuth redirect
        const url = new URL(req.url);
        const linkSessionId = url.searchParams.get("link_session_id");
        const oauthStateId = url.searchParams.get("oauth_state_id");

        if (!linkSessionId || !oauthStateId) {
            return NextResponse.redirect(new URL("/dashboard?error=missing_params", req.url));
        }

        // Redirect to dashboard with success state
        // The frontend Plaid Link will handle the completion with these parameters
        return NextResponse.redirect(
            new URL(`/dashboard?link_session_id=${linkSessionId}&oauth_state_id=${oauthStateId}&oauth_return=true`,
                req.url)
        );
    } catch (error) {
        console.error("Error in Plaid OAuth return:", error);
        return NextResponse.redirect(new URL("/dashboard?error=oauth_return_error", req.url));
    }
} 