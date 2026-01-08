import { headers } from "next/headers";
import { type NextRequest } from "next/server";

import { auth } from "~/lib/auth";
import { getThreadsByUserId } from "~/server/db/queries/chat";

export async function GET(request: NextRequest) {
  const totalStart = Date.now();

  const sessionStart = Date.now();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  console.warn(`[PERF] /api/threads.getSession: ${Date.now() - sessionStart}ms`);

  if (!session?.user) {
    return Response.json({ threads: [], nextCursor: null });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const cursor = searchParams.get("cursor") ?? undefined;

  const dbStart = Date.now();
  const result = await getThreadsByUserId(session.user.id, { limit, cursor });
  console.warn(`[PERF] /api/threads.getThreadsByUserId: ${Date.now() - dbStart}ms`);

  console.warn(`[PERF] /api/threads.total: ${Date.now() - totalStart}ms`);
  return Response.json(result);
}
