import { Buffer } from "node:buffer";
import { serverEnv } from "~/lib/env";
import type { ChatUIMessage } from "~/app/api/chat/route";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

function deriveSecret(user: string, salt: string): Buffer {
  return scryptSync(`${serverEnv.ENCRYPTION_SECRET}:${user}`, salt, 32);
}

export function encryptMessage(content: ChatUIMessage, user: string, salt: string): string {
  const key = deriveSecret(user, salt);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(JSON.stringify(content), "utf-8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}:${cipher.getAuthTag().toString("hex")}`;
}

export function decryptMessage(raw: string, user: string, salt: string): ChatUIMessage {
  const parts = raw.split(":");
  if (parts.length !== 3) throw new Error("invalid encrypted message format");
  
  const [ivHex, dataHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  
  if (iv.length != 16 || tag.length != 16) throw new Error("invalid encryption parameters");

  const key = deriveSecret(user, salt);
  const cipher = createDecipheriv("aes-256-gcm", key, iv);
  cipher.setAuthTag(tag);

  let decrypted = cipher.update(data, undefined, "utf-8");
  decrypted += cipher.final("utf-8");
  return JSON.parse(decrypted);
}
