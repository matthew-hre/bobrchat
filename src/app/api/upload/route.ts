import * as Sentry from "@sentry/nextjs";
import { fileTypeFromBuffer } from "file-type";
import { headers } from "next/headers";
import { Buffer } from "node:buffer";

import { getPdfPageCount } from "~/features/attachments/lib/pdf";
import { saveFile } from "~/features/attachments/lib/storage";
import { getUserStorageUsage, STORAGE_QUOTA_BYTES } from "~/features/attachments/queries";
import { auth } from "~/features/auth/lib/auth";
import { db } from "~/lib/db";
import { attachments } from "~/lib/db/schema/chat";

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
  return Sentry.startSpan(
    { op: "http.server", name: "POST /api/upload" },
    async (span) => {
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

        const incomingSize = files.reduce((sum, f) => sum + f.size, 0);

        span.setAttribute("upload.fileCount", files.length);
        span.setAttribute("upload.totalBytes", incomingSize);

        const currentUsage = await getUserStorageUsage(session.user.id);

        if (currentUsage >= STORAGE_QUOTA_BYTES) {
          return new Response(
            JSON.stringify({
              error: "Storage quota exceeded",
              code: "QUOTA_EXCEEDED",
              used: currentUsage,
              quota: STORAGE_QUOTA_BYTES,
            }),
            { status: 413, headers: { "Content-Type": "application/json" } },
          );
        }

        if (currentUsage + incomingSize > STORAGE_QUOTA_BYTES) {
          const remaining = STORAGE_QUOTA_BYTES - currentUsage;
          return new Response(
            JSON.stringify({
              error: `Upload would exceed storage quota. You have ${Math.round(remaining / 1024 / 1024)}MB remaining.`,
              code: "QUOTA_EXCEEDED",
              used: currentUsage,
              quota: STORAGE_QUOTA_BYTES,
              incoming: incomingSize,
            }),
            { status: 413, headers: { "Content-Type": "application/json" } },
          );
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

          const contentDisposition
            = (preferredMime.startsWith("image/") && preferredMime !== "image/svg+xml")
              || preferredMime === "application/pdf"
              ? "inline"
              : "attachment";

          const uploaded = await saveFile(file, {
            buffer,
            contentTypeOverride: preferredMime,
            contentDisposition,
          });

          const pageCount = preferredMime === "application/pdf"
            ? await getPdfPageCount(buffer)
            : null;

          await db.insert(attachments).values({
            id: uploaded.id,
            userId: session.user.id,
            filename: uploaded.filename,
            mediaType: uploaded.mediaType,
            size: uploaded.size,
            storagePath: uploaded.storagePath,
            pageCount,
            messageId: null,
          });

          results.push({ ...uploaded, pageCount });
        }

        span.setAttribute("upload.successCount", results.length);
        span.setAttribute("upload.errorCount", errors.length);

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
        Sentry.captureException(error, { tags: { operation: "file-upload" } });
        return new Response(
          JSON.stringify({ error: "Failed to process upload" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    },
  );
}
