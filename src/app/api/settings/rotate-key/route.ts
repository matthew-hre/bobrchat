import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "~/features/auth/lib/auth";
import { rotateKey } from "~/lib/security/keys";

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await rotateKey(session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`Key rotation failure: ${err}`);
    return NextResponse.json({ error: "Key rotation failed" }, { status: 500 });
  }
}
