import type { Readable } from "node:stream";

import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Buffer } from "node:buffer";
import path from "node:path";

import { serverEnv } from "~/lib/env";

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

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${serverEnv.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: serverEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: serverEnv.R2_SECRET_ACCESS_KEY,
    },
  });
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
  const client = getR2Client();

  const fileId = generateFileId();
  const ext = path.extname(file.name);
  const key = `uploads/${fileId}${ext}`;

  const buffer = options?.buffer ?? Buffer.from(await file.arrayBuffer());
  const contentType = options?.contentTypeOverride ?? file.type;
  const disposition = options?.contentDisposition ?? "inline";

  const upload = new Upload({
    client,
    params: {
      Bucket: serverEnv.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentDisposition: contentDisposition(disposition, file.name),
    },
  });
  await upload.done();

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
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: serverEnv.R2_BUCKET_NAME,
      Key: storagePath,
    }),
  );
}

export async function getFileContent(storagePath: string): Promise<string> {
  const client = getR2Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: serverEnv.R2_BUCKET_NAME,
      Key: storagePath,
    }),
  );

  return response.Body?.transformToString() ?? "";
}

export async function saveFileBuffer(storagePath: string, buffer: Buffer): Promise<void> {
  const client = getR2Client();
  const upload = new Upload({
    client,
    params: {
      Bucket: serverEnv.R2_BUCKET_NAME,
      Key: storagePath,
      Body: buffer,
      ContentType: "application/octet-stream",
      ContentDisposition: "attachment",
    },
  });
  await upload.done();
}

export async function getFileBuffer(storagePath: string): Promise<Buffer> {
  const client = getR2Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: serverEnv.R2_BUCKET_NAME,
      Key: storagePath,
    }),
  );

  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error("Empty response body from storage");
  }
  return Buffer.from(bytes);
}

export async function getFileStream(storagePath: string): Promise<ReadableStream> {
  const client = getR2Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: serverEnv.R2_BUCKET_NAME,
      Key: storagePath,
    }),
  );

  const body = response.Body;
  if (!body) {
    throw new Error("Empty response body from storage");
  }

  if (typeof (body as Readable).pipe === "function") {
    return readableToWebStream(body as Readable);
  }

  return body.transformToWebStream();
}

function readableToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", err => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}
