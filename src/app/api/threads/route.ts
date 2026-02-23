import type { NextRequest } from "next/server";

import { getSession } from "~/features/auth/lib/session";
import { getThreadsByUserId } from "~/features/chat/queries";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.user) {
    return Response.json({ threads: [], nextCursor: null });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const cursor = searchParams.get("cursor") ?? undefined;
  const archived = searchParams.get("archived") === "true";
  const tagIdsParam = searchParams.get("tagIds");
  const tagIds = tagIdsParam ? tagIdsParam.split(",").filter(Boolean) : undefined;

  const result = await getThreadsByUserId(session.user.id, { limit, cursor, archived, tagIds });

  return Response.json(result);
}
