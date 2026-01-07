import { headers } from "next/headers";

import { auth } from "~/lib/auth";
import { getThreadsByUserId } from "~/server/db/queries/chat";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json([]);
  }

  const threads = await getThreadsByUserId(session.user.id);
  return Response.json(threads);
}
