import { getSession } from "~/features/auth/lib/session";
import { handleChatRequest } from "~/features/chat/server/handler";
import { chatRateLimit, rateLimitResponse } from "~/lib/rate-limit";

export type { ChatUIMessage, CostBreakdown, MessageMetadata } from "~/features/chat/types";

export async function POST(req: Request) {
  const session = await getSession();

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { success, reset } = await chatRateLimit.limit(session.user.id);
  if (!success) {
    return rateLimitResponse(reset);
  }

  return handleChatRequest({ req, userId: session.user.id });
}
