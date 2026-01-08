import { headers } from "next/headers";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { auth } from "~/lib/auth";
import { isThreadOwnedByUser, saveMessage } from "~/server/db/queries/chat";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { threadId, message }: { threadId?: string; message?: ChatUIMessage } = await req.json();

  if (!threadId || !message) {
    return new Response(JSON.stringify({ error: "Missing threadId or message" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isOwned = await isThreadOwnedByUser(threadId, session.user.id);
  if (!isOwned) {
    return new Response(JSON.stringify({ error: "Thread not found or unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  await saveMessage(threadId, session.user.id, message);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
