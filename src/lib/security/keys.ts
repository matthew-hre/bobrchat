import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import { db } from "~/lib/db";
import { messages, threads } from "~/lib/db/schema";
import { keys } from "~/lib/db/schema/keys";

import { decryptMessage, encryptMessage } from "./encryption";

export type KeyMeta = { salt: string; version: number };

/**
 * Get or create encryption key metadata for a user.
 * Uses INSERT ... ON CONFLICT to handle race conditions safely.
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

  await db
    .insert(keys)
    .values({ userId, salt, version: 1 })
    .onConflictDoNothing({ target: keys.userId });

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

const ROTATION_BATCH_SIZE = 100;

/**
 * Rotate a user's encryption key. Re-encrypts all messages with the new key.
 * Uses batched updates to avoid transaction timeouts for users with many messages.
 */
export async function rotateKey(userId: string): Promise<void> {
  const oldMeta = await getKeyMeta(userId);
  if (!oldMeta)
    throw new Error("User has no encryption key to rotate");

  const newVersion = oldMeta.version + 1;
  const newSalt = randomBytes(32).toString("hex");

  const allMessages = await db
    .select({
      id: messages.id,
      iv: messages.iv,
      ciphertext: messages.ciphertext,
      authTag: messages.authTag,
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

        const oldContent = decryptMessage(
          { iv: msg.iv, ciphertext: msg.ciphertext, authTag: msg.authTag },
          userId,
          oldMeta.salt,
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

  await db
    .update(keys)
    .set({ salt: newSalt, version: newVersion, rotatedAt: new Date() })
    .where(eq(keys.userId, userId));
}
