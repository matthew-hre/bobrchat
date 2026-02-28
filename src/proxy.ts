import type { NextRequest } from "next/server";

import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs";

/* eslint-disable node/no-process-env */
const REDIRECT_URI
  = process.env.VERCEL_ENV === "production"
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/callback`
    : process.env.VERCEL_ENV === "preview"
      ? `https://${process.env.VERCEL_URL}/callback`
      : "http://localhost:3000/callback";
/* eslint-enable node/no-process-env */

export default async function proxy(request: NextRequest) {
  const { session, headers, authorizationUrl } = await authkit(request, {
    redirectUri: REDIRECT_URI,
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
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.png$).*)",
  ],
};
