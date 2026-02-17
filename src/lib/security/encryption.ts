import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

import type { ChatUIMessage } from "~/features/chat/types";

import { serverEnv } from "~/lib/env";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export type EncryptedMessage = {
  iv: string;
  ciphertext: string;
  authTag: string;
};

/**
 * Derive encryption key for per-user message encryption.
 * Uses scrypt with ENCRYPTION_SECRET:userId as password and user's salt.
 */
export function deriveUserKey(userId: string, salt: string): Buffer {
  return scryptSync(`${serverEnv.ENCRYPTION_SECRET}:${userId}`, salt, KEY_LENGTH);
}

/**
 * Encrypt a chat message using per-user key derivation.
 *
 * @param content The message content to encrypt
 * @param userId The user's ID (part of key derivation)
 * @param salt The user's unique salt
 * @returns Encrypted message components (iv, ciphertext, authTag as hex strings)
 */
export function encryptMessage(content: ChatUIMessage, userId: string, salt: string): EncryptedMessage {
  const key = deriveUserKey(userId, salt);
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

/**
 * Decrypt a chat message using per-user key derivation.
 *
 * @param encrypted The encrypted message components
 * @param userId The user's ID (part of key derivation)
 * @param salt The user's unique salt
 * @returns The decrypted message content
 * @throws If decryption fails or JSON is malformed
 */
export function decryptMessage(encrypted: EncryptedMessage, userId: string, salt: string): ChatUIMessage {
  const key = deriveUserKey(userId, salt);
  return decryptMessageWithKey(encrypted, key);
}

/**
 * Decrypt a chat message using a pre-derived key (e.g., cached per request).
 */
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

/**
 * Encrypt a binary buffer using AES-256-GCM.
 * Returns a single buffer: MAGIC(4) | version(1) | iv(16) | authTag(16) | ciphertext(N)
 */
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

/**
 * Decrypt a binary buffer that was encrypted with encryptBuffer.
 * Expects format: MAGIC(4) | version(1) | iv(16) | authTag(16) | ciphertext(N)
 */
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

/**
 * Check if a buffer starts with the encrypted attachment magic header.
 */
export function isEncryptedBuffer(data: Buffer): boolean {
  return data.length >= ATTACHMENT_MAGIC.length && data.subarray(0, 4).equals(ATTACHMENT_MAGIC);
}

/**
 * Derive encryption key for API key encryption (global, not per-user).
 * Uses ENCRYPTION_SECRET with ENCRYPTION_SALT.
 */
function getApiKeyEncryptionKey(): Buffer {
  return scryptSync(serverEnv.ENCRYPTION_SECRET, serverEnv.ENCRYPTION_SALT, KEY_LENGTH);
}

/**
 * Encrypt a sensitive value (e.g., API key) using global encryption.
 *
 * Uses AES-256-GCM with:
 * - 16-byte random IV (unique per encryption)
 * - 16-byte auth tag for tamper detection
 *
 * @param plaintext The value to encrypt
 * @returns Encrypted value in "hex(iv):hex(ciphertext):hex(authTag)" format
 */
export function encryptValue(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getApiKeyEncryptionKey(), iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

/**
 * Decrypt a sensitive value (e.g., API key).
 *
 * @param encrypted The encrypted value in "hex(iv):hex(ciphertext):hex(authTag)" format
 * @returns Decrypted plaintext
 * @throws If decryption fails (invalid key, corrupted data, or tampered data)
 */
export function decryptValue(encrypted: string): string {
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

  const decipher = createDecipheriv(ALGORITHM, getApiKeyEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
