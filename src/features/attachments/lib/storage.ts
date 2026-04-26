import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Buffer } from "node:buffer";
import path from "node:path";

/**
 * Build a Content-Disposition header value that is safe for non-ASCII filenames.
 * Uses RFC 5987 filename* for Unicode support, with an ASCII fallback.
 */
export function contentDisposition(disposition: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename).replace(/['()]/g, escape);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export type UploadedFile = {
  id: string;
  filename: string;
  mediaType: string;
  size: number;
  url: string;
  storagePath: string;
  pageCount?: number | null;
};

function getR2Bucket(): R2Bucket {
  const { env } = getCloudflareContext();
  return env.R2_BUCKET;
}

function generateFileId(): string {
  return crypto.randomUUID();
}

export async function saveFile(
  file: File,
  options?: {
    buffer?: Buffer;
    contentTypeOverride?: string;
    contentDisposition?: "inline" | "attachment";
  },
): Promise<UploadedFile> {
  const bucket = getR2Bucket();

  const fileId = generateFileId();
  const ext = path.extname(file.name);
  const key = `uploads/${fileId}${ext}`;

  const buffer = options?.buffer ?? Buffer.from(await file.arrayBuffer());
  const contentType = options?.contentTypeOverride ?? file.type;
  const disposition = options?.contentDisposition ?? "inline";

  await bucket.put(key, buffer, {
    httpMetadata: {
      contentType,
      contentDisposition: contentDisposition(disposition, file.name),
    },
  });

  return {
    id: fileId,
    filename: file.name,
    mediaType: contentType,
    size: file.size,
    url: `/api/attachments/file?id=${fileId}`,
    storagePath: key,
  };
}

export async function deleteFile(storagePath: string): Promise<void> {
  const bucket = getR2Bucket();
  await bucket.delete(storagePath);
}

export async function getFileContent(storagePath: string): Promise<string> {
  const bucket = getR2Bucket();
  const object = await bucket.get(storagePath);

  if (!object) {
    throw new Error(`Object not found: ${storagePath}`);
  }

  return object.text();
}

export async function saveFileBuffer(storagePath: string, buffer: Buffer): Promise<void> {
  const bucket = getR2Bucket();
  await bucket.put(storagePath, buffer, {
    httpMetadata: {
      contentType: "application/octet-stream",
      contentDisposition: "attachment",
    },
  });
}

export async function getFileBuffer(storagePath: string): Promise<Buffer> {
  const bucket = getR2Bucket();
  const object = await bucket.get(storagePath);

  if (!object) {
    throw new Error(`Object not found: ${storagePath}`);
  }

  const arrayBuffer = await object.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getFileStream(storagePath: string): Promise<ReadableStream> {
  const bucket = getR2Bucket();
  const object = await bucket.get(storagePath);

  if (!object) {
    throw new Error(`Object not found: ${storagePath}`);
  }

  return object.body;
}
