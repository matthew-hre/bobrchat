import type { NextRequest } from "next/server";

import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs";

export default async function proxy(request: NextRequest) {
  const { session, headers, authorizationUrl } = await authkit(request);

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
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.png$).*)",
  ],
};
