import type { NextRequest } from "next/server";

import { headers } from "next/headers";

import { auth } from "~/features/auth/lib/auth";
import { getThreadsByUserId } from "~/features/chat/queries";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ threads: [], nextCursor: null });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const cursor = searchParams.get("cursor") ?? undefined;
  const archived = searchParams.get("archived") === "true";

  const result = await getThreadsByUserId(session.user.id, { limit, cursor, archived });

  return Response.json(result);
}
