import { getCloudflareContext } from "@opennextjs/cloudflare";

import { serverEnv } from "~/lib/env";

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
  return env.R2_UPLOADS;
}

function generateFileId(): string {
  return crypto.randomUUID();
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot);
}

export async function saveFile(
  file: File,
  options?: {
    buffer?: ArrayBuffer;
    contentTypeOverride?: string;
    contentDisposition?: "inline" | "attachment";
  },
): Promise<UploadedFile> {
  const bucket = getR2Bucket();

  const fileId = generateFileId();
  const ext = getExtension(file.name);
  const key = `uploads/${fileId}${ext}`;

  const body = options?.buffer ?? (await file.arrayBuffer());
  const contentType = options?.contentTypeOverride ?? file.type;
  const disposition = options?.contentDisposition ?? "inline";

  await bucket.put(key, body, {
    httpMetadata: {
      contentType,
      contentDisposition: `${disposition}; filename="${file.name}"`,
    },
  });

  const publicUrl = `${serverEnv.R2_PUBLIC_URL}/${key}`;

  return {
    id: fileId,
    filename: file.name,
    mediaType: contentType,
    size: file.size,
    url: publicUrl,
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
    return "";
  }

  return object.text();
}
