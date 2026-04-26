import type { NextRequest } from "next/server";

import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs";

function getRedirectUri(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}/callback`;
}

export default async function middleware(request: NextRequest) {
  const { session, headers, authorizationUrl } = await authkit(request, {
    redirectUri: getRedirectUri(request),
  });

  const { pathname } = request.nextUrl;

  const protectedRoutes = ["/chat", "/settings"];

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute && !session.user && authorizationUrl) {
    return handleAuthkitHeaders(request, headers, { redirect: authorizationUrl });
  }

  return handleAuthkitHeaders(request, headers);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$).*)",
  ],
};
