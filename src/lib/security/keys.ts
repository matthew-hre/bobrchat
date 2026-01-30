import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import { db } from "~/lib/db";
import { messages, threads } from "~/lib/db/schema";
import { keys, keySalts } from "~/lib/db/schema/keys";

import { decryptMessage, encryptMessage } from "./encryption";

export type KeyMeta = { salt: string; version: number };

/**
 * Get or create encryption key metadata for a user.
 * Uses INSERT ... ON CONFLICT to handle race conditions safely.
 * Also ensures the salt is stored in the history table.
 */
export async function getOrCreateKeyMeta(userId: string): Promise<KeyMeta> {
  const existing = await db
    .select({ salt: keys.salt, version: keys.version })
    .from(keys)
    .where(eq(keys.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return { salt: existing[0].salt, version: existing[0].version };
  }

  const salt = randomBytes(32).toString("hex");

  await db.transaction(async (tx) => {
    await tx
      .insert(keys)
      .values({ userId, salt, version: 1 })
      .onConflictDoNothing({ target: keys.userId });

    await tx
      .insert(keySalts)
      .values({ userId, version: 1, salt })
      .onConflictDoNothing();
  });

  const result = await db
    .select({ salt: keys.salt, version: keys.version })
    .from(keys)
    .where(eq(keys.userId, userId))
    .limit(1);

  if (result.length === 0) {
    throw new Error("Failed to create encryption key for user");
  }

  return { salt: result[0].salt, version: result[0].version };
}

/**
 * Get encryption key metadata for a user, if it exists.
 */
export async function getKeyMeta(userId: string): Promise<KeyMeta | undefined> {
  const result = await db
    .select({ salt: keys.salt, version: keys.version })
    .from(keys)
    .where(eq(keys.userId, userId))
    .limit(1);

  if (result.length === 0)
    return undefined;
  return { salt: result[0].salt, version: result[0].version };
}

/**
 * Get the salt for a specific key version.
 * Used during decryption to get the correct salt for a message's keyVersion.
 */
export async function getSaltForVersion(userId: string, version: number): Promise<string | undefined> {
  const result = await db
    .select({ salt: keySalts.salt })
    .from(keySalts)
    .where(and(eq(keySalts.userId, userId), eq(keySalts.version, version)))
    .limit(1);

  if (result.length === 0) {
    return undefined;
  }
  return result[0].salt;
}

const ROTATION_BATCH_SIZE = 100;

/**
 * Rotate a user's encryption key. Re-encrypts all messages with the new key.
 * Uses batched updates to avoid transaction timeouts for users with many messages.
 *
 * Key safety features:
 * - Stores per-version salts so old messages remain decryptable during rotation
 * - Uses a rotation lock to prevent concurrent rotations
 * - Decrypts using message.keyVersion to get the correct salt
 */
export async function rotateKey(userId: string): Promise<void> {
  const oldMeta = await getKeyMeta(userId);
  if (!oldMeta)
    throw new Error("User has no encryption key to rotate");

  // Check for and acquire rotation lock
  const lockResult = await db
    .update(keys)
    .set({ rotationInProgress: true })
    .where(and(eq(keys.userId, userId), eq(keys.rotationInProgress, false)))
    .returning({ userId: keys.userId });

  if (lockResult.length === 0) {
    throw new Error("Key rotation already in progress for this user");
  }

  const newVersion = oldMeta.version + 1;
  const newSalt = randomBytes(32).toString("hex");

  try {
    // Store the new salt in history BEFORE re-encrypting messages
    // This ensures new messages written during rotation use the new salt
    await db.insert(keySalts).values({ userId, version: newVersion, salt: newSalt });

    // Update the current version pointer so new messages use the new salt
    await db
      .update(keys)
      .set({ salt: newSalt, version: newVersion })
      .where(eq(keys.userId, userId));

    // Fetch all messages that still need migration (not yet on newVersion)
    const allMessages = await db
      .select({
        id: messages.id,
        iv: messages.iv,
        ciphertext: messages.ciphertext,
        authTag: messages.authTag,
        keyVersion: messages.keyVersion,
      })
      .from(messages)
      .innerJoin(threads, eq(messages.threadId, threads.id))
      .where(eq(threads.userId, userId));

    for (let i = 0; i < allMessages.length; i += ROTATION_BATCH_SIZE) {
      const batch = allMessages.slice(i, i + ROTATION_BATCH_SIZE);

      await db.transaction(async (tx) => {
        for (const msg of batch) {
          if (!msg.iv || !msg.ciphertext || !msg.authTag)
            continue;

          // Skip messages already on the new version
          if (msg.keyVersion === newVersion)
            continue;

          // Get the salt for this message's version from history
          const msgSalt = await getSaltForVersion(userId, msg.keyVersion ?? oldMeta.version);
          if (!msgSalt) {
            throw new Error(`Missing salt for version ${msg.keyVersion} during rotation`);
          }

          const oldContent = decryptMessage(
            { iv: msg.iv, ciphertext: msg.ciphertext, authTag: msg.authTag },
            userId,
            msgSalt,
          );
          const newEncrypted = encryptMessage(oldContent, userId, newSalt);

          await tx
            .update(messages)
            .set({
              iv: newEncrypted.iv,
              ciphertext: newEncrypted.ciphertext,
              authTag: newEncrypted.authTag,
              keyVersion: newVersion,
            })
            .where(eq(messages.id, msg.id));
        }
      });
    }

    // Mark rotation complete
    await db
      .update(keys)
      .set({ rotationInProgress: false, rotatedAt: new Date() })
      .where(eq(keys.userId, userId));
  }
  catch (error) {
    // Release lock on failure (rotation can be retried)
    await db
      .update(keys)
      .set({ rotationInProgress: false })
      .where(eq(keys.userId, userId));
    throw error;
  }
}
