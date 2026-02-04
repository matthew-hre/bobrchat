import { headers } from "next/headers";

import { getUserStorageUsage } from "~/features/attachments/queries";
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

  const [used, { quota, tier }] = await Promise.all([
    getUserStorageUsage(session.user.id),
    getStorageQuota(session.user.id),
  ]);

  return new Response(
    JSON.stringify({
      used,
      quota,
      tier,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
