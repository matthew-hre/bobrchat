import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { ChatUIMessage } from "~/features/chat/types";

import { serverEnv } from "~/lib/env";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;

export type EncryptedMessage = {
  iv: string;
  ciphertext: string;
  authTag: string;
};

const keyCache = new Map<string, Buffer>();

// PBKDF2-SHA256 via Web Crypto (async, off main thread in Workers)
async function pbkdf2DeriveKey(password: string, salt: string): Promise<Buffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  return Buffer.from(bits);
}

// Per-user key: PBKDF2(ENCRYPTION_SECRET:userId, salt). Cached per isolate.
export async function deriveUserKey(userId: string, salt: string): Promise<Buffer> {
  const cacheKey = `${userId}:${salt}`;
  const cached = keyCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const key = await pbkdf2DeriveKey(`${serverEnv.ENCRYPTION_SECRET}:${userId}`, salt);
  keyCache.set(cacheKey, key);
  return key;
}

// Encrypt a chat message with per-user key derivation.
export async function encryptMessage(content: ChatUIMessage, userId: string, salt: string): Promise<EncryptedMessage> {
  const key = await deriveUserKey(userId, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(JSON.stringify(content), "utf-8", "hex");
  encrypted += cipher.final("hex");

  return {
    iv: iv.toString("hex"),
    ciphertext: encrypted,
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

// Decrypt a chat message with per-user key derivation.
export async function decryptMessage(encrypted: EncryptedMessage, userId: string, salt: string): Promise<ChatUIMessage> {
  const key = await deriveUserKey(userId, salt);
  return decryptMessageWithKey(encrypted, key);
}

// Decrypt with a pre-derived key (skips key derivation).
export function decryptMessageWithKey(encrypted: EncryptedMessage, key: Buffer): ChatUIMessage {
  const iv = Buffer.from(encrypted.iv, "hex");
  const data = Buffer.from(encrypted.ciphertext, "hex");
  const tag = Buffer.from(encrypted.authTag, "hex");

  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("Invalid encryption parameters");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data, undefined, "utf-8");
  decrypted += decipher.final("utf-8");

  try {
    return JSON.parse(decrypted) as ChatUIMessage;
  }
  catch {
    throw new Error("Failed to parse decrypted message: malformed JSON");
  }
}

// ── Attachment (binary buffer) encryption ────────────────────────────────
const ATTACHMENT_MAGIC = Buffer.from("BCA1");
const ATTACHMENT_VERSION = 1;
const ATTACHMENT_HEADER_LENGTH = ATTACHMENT_MAGIC.length + 1 + IV_LENGTH + TAG_LENGTH; // 4+1+16+16 = 37

// AES-256-GCM. Wire format: MAGIC(4) | version(1) | iv(16) | authTag(16) | ciphertext(N)
export function encryptBuffer(plaintext: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const header = Buffer.alloc(5);
  ATTACHMENT_MAGIC.copy(header);
  header[4] = ATTACHMENT_VERSION;

  return Buffer.concat([header, iv, authTag, encrypted]);
}

// Inverse of encryptBuffer.
export function decryptBuffer(data: Buffer, key: Buffer): Buffer {
  if (data.length < ATTACHMENT_HEADER_LENGTH) {
    throw new Error("Encrypted data too short");
  }

  if (!data.subarray(0, 4).equals(ATTACHMENT_MAGIC)) {
    throw new Error("Invalid encryption magic header");
  }

  const version = data[4];
  if (version !== ATTACHMENT_VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  const iv = data.subarray(5, 5 + IV_LENGTH);
  const authTag = data.subarray(5 + IV_LENGTH, 5 + IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(ATTACHMENT_HEADER_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Check for encrypted attachment magic header.
export function isEncryptedBuffer(data: Buffer): boolean {
  return data.length >= ATTACHMENT_MAGIC.length && data.subarray(0, 4).equals(ATTACHMENT_MAGIC);
}

const API_KEY_CACHE_KEY = "__api_key_encryption__";

// Global key for API key encryption. Cached per isolate.
async function getApiKeyEncryptionKey(): Promise<Buffer> {
  const cached = keyCache.get(API_KEY_CACHE_KEY);
  if (cached) {
    return cached;
  }
  const key = await pbkdf2DeriveKey(serverEnv.ENCRYPTION_SECRET, serverEnv.ENCRYPTION_SALT);
  keyCache.set(API_KEY_CACHE_KEY, key);
  return key;
}

// Encrypt a value with the global key. Returns "hex(iv):hex(ciphertext):hex(authTag)".
export async function encryptValue(plaintext: string): Promise<string> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, await getApiKeyEncryptionKey(), iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

// Inverse of encryptValue.
export async function decryptValue(encrypted: string): Promise<string> {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }

  const [ivHex, encryptedHex, authTagHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const encryptedData = Buffer.from(encryptedHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (iv.length !== IV_LENGTH || authTag.length !== TAG_LENGTH) {
    throw new Error("Invalid encryption parameters");
  }

  const decipher = createDecipheriv(ALGORITHM, await getApiKeyEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
