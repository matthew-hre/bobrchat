import { headers } from "next/headers";

import { getUserStorageUsage, STORAGE_QUOTA_BYTES } from "~/features/attachments/queries";
import { auth } from "~/features/auth/lib/auth";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const used = await getUserStorageUsage(session.user.id);

  return new Response(
    JSON.stringify({
      used,
      quota: STORAGE_QUOTA_BYTES,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
