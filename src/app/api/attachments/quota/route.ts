import { headers } from "next/headers";

import { auth } from "~/features/auth/lib/auth";
import { getStorageQuota } from "~/features/subscriptions";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { usedBytes: used, quota, tier } = await getStorageQuota(session.user.id);

  return new Response(
    JSON.stringify({
      used,
      quota,
      tier,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
