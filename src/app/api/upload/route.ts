import { fileTypeFromBuffer } from "file-type";
import { headers } from "next/headers";
import { Buffer } from "node:buffer";

import { auth } from "~/lib/auth";
import { db } from "~/lib/db";
import { attachments } from "~/lib/db/schema/chat";
import { saveFile } from "~/lib/storage";

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
  "application/pdf",
  "application/json",
]);

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

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push({
          filename: file.name,
          error: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const detected = await fileTypeFromBuffer(buffer);
      const detectedMime = detected?.mime;
      const claimedMime = file.type || undefined;

      const preferredMime = detectedMime ?? claimedMime ?? "application/octet-stream";
      const isAllowed = ALLOWED_TYPES.has(preferredMime)
        || (!!detectedMime && ALLOWED_TYPES.has(detectedMime))
        || (!!claimedMime && ALLOWED_TYPES.has(claimedMime));

      if (!isAllowed) {
        errors.push({
          filename: file.name,
          error: `File type ${preferredMime} is not allowed`,
        });
        continue;
      }

      // Downgrade disposition for non-visual types to reduce inline execution risk
      const contentDisposition = preferredMime.startsWith("image/") || preferredMime === "application/pdf"
        ? "inline"
        : "attachment";

      const uploaded = await saveFile(file, {
        buffer,
        contentTypeOverride: preferredMime,
        contentDisposition,
      });

      await db.insert(attachments).values({
        id: uploaded.id,
        userId: session.user.id,
        filename: uploaded.filename,
        mediaType: uploaded.mediaType,
        size: uploaded.size,
        storagePath: uploaded.storagePath,
        messageId: null,
      });

      results.push(uploaded);
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
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process upload" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
