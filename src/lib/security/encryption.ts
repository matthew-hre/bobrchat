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
function deriveUserKey(userId: string, salt: string): Buffer {
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
  const iv = Buffer.from(encrypted.iv, "hex");
  const data = Buffer.from(encrypted.ciphertext, "hex");
  const tag = Buffer.from(encrypted.authTag, "hex");

  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("Invalid encryption parameters");
  }

  const key = deriveUserKey(userId, salt);
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
