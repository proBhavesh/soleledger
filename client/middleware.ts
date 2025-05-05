import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Paths that require authentication
const protectedPaths = ["/dashboard", "/profile", "/settings"];

// Paths that are accessible only to non-authenticated users
const authPaths = ["/login", "/register", "/forgot-password"];

// Public marketing pages
const marketingPaths = ["/about", "/contact", "/terms", "/privacy"];

// Paths in the subscription flow
const subscriptionPaths = ["/pricing"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the path is protected or requires auth
    const isProtectedPath = protectedPaths.some((path) =>
        pathname === path || pathname.startsWith(`${path}/`)
    );
    const isAuthPath = authPaths.some((path) => pathname === path);
    const isMarketingPath = marketingPaths.some((path) => pathname === path);
    const isSubscriptionPath = subscriptionPaths.some((path) => pathname === path);
    const isLandingPage = pathname === "/";

    // Check if there's a subscription parameter in the URL
    const hasJustSubscribed = request.nextUrl.searchParams.has("subscription");

    // Get the authentication token
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const isAuthenticated = !!token;

    // Handle protected routes - redirect to login if not authenticated
    if (isProtectedPath && !isAuthenticated) {
        const url = new URL("/login", request.url);
        url.searchParams.set("callbackUrl", encodeURI(pathname));
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users from auth pages to dashboard or pricing
    if ((isAuthPath || isLandingPage) && isAuthenticated) {
        // Use hasSubscription cookie to determine where to redirect
        const hasSubscription = request.cookies.get("hasSubscription")?.value === "true";

        if (hasSubscription || hasJustSubscribed) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        } else {
            return NextResponse.redirect(new URL("/pricing", request.url));
        }
    }

    // For new signups, check if we need to go through pricing
    if (pathname === "/dashboard" && isAuthenticated) {
        // Check if user has a subscription or just completed subscription flow
        const hasSubscription = request.cookies.get("hasSubscription")?.value === "true";

        if (!hasSubscription && !hasJustSubscribed) {
            // Redirect to pricing page if they don't have a subscription
            return NextResponse.redirect(new URL("/pricing", request.url));
        }
    }

    // Allow access to all other routes
    return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
    matcher: [
        // Apply to all paths except those with extensions (static files),
        // api routes, and _next
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
    ],
}; 