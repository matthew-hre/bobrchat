import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import { getSession } from "~/features/auth/lib/session";

/**
 * Proxy middleware to handle authentication
 * Redirects unauthenticated users to the auth modal dialog
 * Using parallel routes: /(.)auth intercepts /auth route
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes that require authentication
  const protectedRoutes = ["/chat", "/settings"];

  // Routes that don't require authentication
  const publicRoutes = ["/auth", "/api", "/share"];

  // Check if current route requires authentication
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route),
  );
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Skip auth check for public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  try {
    const session = await getSession();

    // User is authenticated
    if (session) {
      return NextResponse.next();
    }

    // User is not authenticated and trying to access protected route
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/auth", request.nextUrl.origin));
    }

    return NextResponse.next();
  }
  catch (error) {
    console.error("Auth check error:", error);

    // On error, if accessing protected route, redirect appropriately
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/auth", request.nextUrl.origin));
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Match all routes except those that should never go through auth check
    "/((?!api|_next/static|_next/image|.*\\.png$).*)",
  ],
};
