import { fileTypeFromBuffer } from "file-type";
import { headers } from "next/headers";
import { Buffer } from "node:buffer";

import { getPdfPageCount } from "~/features/attachments/lib/pdf";
import { saveFile } from "~/features/attachments/lib/storage";
import { auth } from "~/features/auth/lib/auth";
import { getStorageQuota } from "~/features/subscriptions";
import { db } from "~/lib/db";
import { attachments } from "~/lib/db/schema/chat";
import { rateLimitResponse, uploadRateLimit } from "~/lib/rate-limit";
import { deriveUserKey, encryptBuffer } from "~/lib/security/encryption";
import { getOrCreateKeyMeta } from "~/lib/security/keys";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/javascript",
  "text/typescript",
  "text/x-python",
  "text/x-java",
  "text/x-c",
  "text/x-c++",
  "text/x-go",
  "text/x-rust",
  "text/html",
  "text/css",
  "text/xml",
  "application/pdf",
  "application/json",
  "application/javascript",
  "application/typescript",
  "application/x-sh",
]);

function normalizeMediaType(mime: string): string {
  return mime.split(";")[0].trim();
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const keyMeta = await getOrCreateKeyMeta(session.user.id);
  const encryptionKey = deriveUserKey(session.user.id, keyMeta.salt);

  const { success, reset } = await uploadRateLimit.limit(session.user.id);
  if (!success) {
    return rateLimitResponse(reset);
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const clientIds = formData.getAll("clientIds") as string[];

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const incomingSize = files.reduce((sum, f) => sum + f.size, 0);

    const { usedBytes: currentUsage, quota: storageQuota } = await getStorageQuota(session.user.id);

    if (currentUsage >= storageQuota) {
      return new Response(
        JSON.stringify({
          error: "Storage quota exceeded",
          code: "QUOTA_EXCEEDED",
          used: currentUsage,
          quota: storageQuota,
        }),
        { status: 413, headers: { "Content-Type": "application/json" } },
      );
    }

    if (currentUsage + incomingSize > storageQuota) {
      const remaining = storageQuota - currentUsage;
      return new Response(
        JSON.stringify({
          error: `Upload would exceed storage quota. You have ${Math.round(remaining / 1024 / 1024)}MB remaining.`,
          code: "QUOTA_EXCEEDED",
          used: currentUsage,
          quota: storageQuota,
          incoming: incomingSize,
        }),
        { status: 413, headers: { "Content-Type": "application/json" } },
      );
    }

    const results = [];
    const errors = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const clientId = clientIds[index];

      if (file.size > MAX_FILE_SIZE) {
        errors.push({
          filename: file.name,
          error: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          ...(clientId && { clientId }),
        });
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const detected = await fileTypeFromBuffer(buffer);
      const detectedMime = detected?.mime ? normalizeMediaType(detected.mime) : undefined;
      const claimedMime = file.type ? normalizeMediaType(file.type) : undefined;

      const preferredMime = detectedMime ?? claimedMime ?? "application/octet-stream";
      const isAllowed = ALLOWED_TYPES.has(preferredMime)
        || (!!detectedMime && ALLOWED_TYPES.has(detectedMime))
        || (!!claimedMime && ALLOWED_TYPES.has(claimedMime))
        || preferredMime.startsWith("text/");

      if (!isAllowed) {
        errors.push({
          filename: file.name,
          error: `File type ${preferredMime} is not allowed`,
          ...(clientId && { clientId }),
        });
        continue;
      }

      const encryptedBuffer = encryptBuffer(buffer, encryptionKey);

      const uploaded = await saveFile(file, {
        buffer: encryptedBuffer,
        contentTypeOverride: "application/octet-stream",
        contentDisposition: "attachment",
      });

      const pageCount = preferredMime === "application/pdf"
        ? await getPdfPageCount(buffer)
        : null;

      await db.insert(attachments).values({
        id: uploaded.id,
        userId: session.user.id,
        filename: uploaded.filename,
        mediaType: preferredMime,
        size: uploaded.size,
        storagePath: uploaded.storagePath,
        pageCount,
        keyVersion: keyMeta.version,
        isEncrypted: true,
        messageId: null,
      });

      results.push({
        ...uploaded,
        url: `/api/attachments/file?id=${uploaded.id}`,
        mediaType: preferredMime,
        pageCount,
        ...(clientId && { clientId }),
      });
    }

    const postUploadUsage = await getStorageQuota(session.user.id);
    if (postUploadUsage.usedBytes > postUploadUsage.quota) {
      console.warn("[Upload] Storage quota exceeded post-upload", {
        userId: session.user.id,
        used: postUploadUsage.usedBytes,
        quota: postUploadUsage.quota,
      });
    }

    return new Response(
      JSON.stringify({
        files: results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  catch (error) {
    console.error("Upload failed", error);
    return new Response(
      JSON.stringify({ error: "Failed to process upload" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
