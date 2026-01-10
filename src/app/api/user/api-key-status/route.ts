import { headers } from "next/headers";

import { auth } from "~/features/auth/lib/auth";
import { hasKeyConfigured } from "~/lib/api-keys/server";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKeyConfigured = await hasKeyConfigured(session.user.id, "openrouter");

  return new Response(
    JSON.stringify({ hasApiKey: apiKeyConfigured }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
