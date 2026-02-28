import { and, eq } from "drizzle-orm";

import { getFileBuffer } from "~/features/attachments/lib/storage";
import { getSession } from "~/features/auth/lib/session";
import { db } from "~/lib/db";
import { attachments } from "~/lib/db/schema/chat";
import { decryptBuffer, deriveUserKey, isEncryptedBuffer } from "~/lib/security/encryption";
import { getSaltForVersion } from "~/lib/security/keys";

export async function GET(req: Request) {
  const session = await getSession();

  if (!session?.user) {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const [attachment] = await db
    .select({
      storagePath: attachments.storagePath,
      mediaType: attachments.mediaType,
      userId: attachments.userId,
      keyVersion: attachments.keyVersion,
      isEncrypted: attachments.isEncrypted,
    })
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.userId, session.user.id)))
    .limit(1);

  if (!attachment) {
    return new Response("Attachment not found", { status: 404 });
  }

  const raw = await getFileBuffer(attachment.storagePath);

  let content: string;
  if (attachment.isEncrypted && isEncryptedBuffer(raw)) {
    const salt = await getSaltForVersion(attachment.userId, attachment.keyVersion ?? 1);
    if (!salt) {
      return new Response("Decryption key not found", { status: 500 });
    }
    const key = await deriveUserKey(attachment.userId, salt);
    content = decryptBuffer(raw, key).toString("utf-8");
  }
  else {
    content = raw.toString("utf-8");
  }

  return new Response(content, {
    headers: {
      "Content-Type": attachment.mediaType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
