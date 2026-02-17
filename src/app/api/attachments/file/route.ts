import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { getFileBuffer } from "~/features/attachments/lib/storage";
import { auth } from "~/features/auth/lib/auth";
import { db } from "~/lib/db";
import { attachments } from "~/lib/db/schema/chat";
import { decryptBuffer, deriveUserKey, isEncryptedBuffer } from "~/lib/security/encryption";
import { getSaltForVersion } from "~/lib/security/keys";

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
    .select({
      storagePath: attachments.storagePath,
      mediaType: attachments.mediaType,
      filename: attachments.filename,
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

  let body = raw;
  if (attachment.isEncrypted && isEncryptedBuffer(raw)) {
    const salt = await getSaltForVersion(attachment.userId, attachment.keyVersion ?? 1);
    if (!salt) {
      return new Response("Decryption key not found", { status: 500 });
    }
    const key = deriveUserKey(attachment.userId, salt);
    body = decryptBuffer(raw, key);
  }
  else {
    body = raw;
  }

  const isInline
    = (attachment.mediaType.startsWith("image/") && attachment.mediaType !== "image/svg+xml")
      || attachment.mediaType === "application/pdf";

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": attachment.mediaType,
      "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${attachment.filename}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
