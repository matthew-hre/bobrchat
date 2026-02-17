import { and, eq } from "drizzle-orm";

import { getFileBuffer } from "~/features/attachments/lib/storage";
import { getShareByShareId } from "~/features/chat/sharing-queries";
import { db } from "~/lib/db";
import { attachments, messages } from "~/lib/db/schema/chat";
import { decryptBuffer, deriveUserKey, isEncryptedBuffer } from "~/lib/security/encryption";
import { getSaltForVersion } from "~/lib/security/keys";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const share = await getShareByShareId(shareId);
  if (!share || !share.showAttachments) {
    return new Response("Share not found or attachments hidden", { status: 404 });
  }

  // Verify the attachment belongs to the shared thread
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
    .innerJoin(messages, eq(attachments.messageId, messages.id))
    .where(and(eq(attachments.id, id), eq(messages.threadId, share.threadId)))
    .limit(1);

  if (!attachment) {
    return new Response("Attachment not found in shared thread", { status: 404 });
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
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
