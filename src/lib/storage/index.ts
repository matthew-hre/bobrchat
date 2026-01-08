import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Buffer } from "node:buffer";
import path from "node:path";

import { serverEnv } from "~/lib/env";

export type UploadedFile = {
  id: string;
  filename: string;
  mediaType: string;
  size: number;
  url: string;
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

export async function saveFile(file: File): Promise<UploadedFile> {
  const client = getR2Client();

  const fileId = generateFileId();
  const ext = path.extname(file.name);
  const key = `uploads/${fileId}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: serverEnv.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentDisposition: `inline; filename="${file.name}"`,
    }),
  );

  const publicUrl = `${serverEnv.R2_PUBLIC_URL}/${key}`;

  return {
    id: fileId,
    filename: file.name,
    mediaType: file.type,
    size: file.size,
    url: publicUrl,
  };
}
