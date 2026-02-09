import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { getFileContent } from "~/features/attachments/lib/storage";
import { auth } from "~/features/auth/lib/auth";
import { db } from "~/lib/db";
import { attachments } from "~/lib/db/schema/chat";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const [attachment] = await db
    .select({ storagePath: attachments.storagePath, mediaType: attachments.mediaType, userId: attachments.userId })
    .from(attachments)
    .where(eq(attachments.id, id))
    .limit(1);

  if (!attachment) {
    return new Response("Attachment not found", { status: 404 });
  }

  if (attachment.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const content = await getFileContent(attachment.storagePath);

  return new Response(content, {
    headers: {
      "Content-Type": attachment.mediaType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
