import type { ChatUIMessage } from "~/features/chat/types";

import { getSession } from "~/features/auth/lib/session";
import { saveMessage } from "~/features/chat/queries";

export async function POST(req: Request) {
  const session = await getSession();

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

  // Ownership is enforced at the DB layer by saveMessage (userId in WHERE clause)
  await saveMessage(threadId, session.user.id, message);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
