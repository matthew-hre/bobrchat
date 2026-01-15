import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

import { serverEnv } from "~/lib/env";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derive encryption key from the master secret
 */
function getEncryptionKey(): Buffer {
  return scryptSync(serverEnv.ENCRYPTION_SECRET, serverEnv.ENCRYPTION_SALT, KEY_LENGTH);
}

/**
 * Encrypt a sensitive value (e.g., API key)
 *
 * Uses AES-256-GCM with:
 * - 16-byte random IV (unique per encryption)
 * - 16-byte auth tag for tamper detection
 *
 * @param plaintext The value to encrypt
 * @return {string} Encrypted value in "hex(iv):hex(ciphertext):hex(authTag)" format
 */
export function encryptValue(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

/**
 * Decrypt a sensitive value
 *
 * @param encrypted The encrypted value in "hex(iv):hex(ciphertext):hex(authTag)" format
 * @return {string} Decrypted plaintext
 * @throws {Error} If decryption fails (invalid key, corrupted data, or tampered data)
 */
export function decryptValue(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }

  const [ivHex, encryptedHex, authTagHex] = parts;

  try {
    const iv = Buffer.from(ivHex, "hex");
    const encryptedData = Buffer.from(encryptedHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    if (iv.length !== IV_LENGTH || authTag.length !== TAG_LENGTH) {
      throw new Error("Invalid encryption parameters");
    }

    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
  catch (error) {
    throw new Error(
      `Failed to decrypt value: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
