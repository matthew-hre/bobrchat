import { NextResponse } from "next/server";

import { getSession } from "~/features/auth/lib/session";
import { rateLimitResponse, rotateKeyRateLimit } from "~/lib/rate-limit";
import { rotateKey } from "~/lib/security/keys";

export async function POST() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success, reset } = await rotateKeyRateLimit.limit(session.user.id);
  if (!success) {
    return rateLimitResponse(reset);
  }

  try {
    await rotateKey(session.user.id);
    return NextResponse.json({ success: true });
  }
  catch (err) {
    console.error(`Key rotation failure: ${err}`);
    return NextResponse.json({ error: "Key rotation failed" }, { status: 500 });
  }
}
