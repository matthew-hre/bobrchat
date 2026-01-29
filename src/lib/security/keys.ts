import { eq } from "drizzle-orm";
import { db } from "../db";
import { keys } from "../db/schema/keys";
import { randomBytes } from "node:crypto";
import { messages, threads } from "../db/schema";
import { decryptMessage, encryptMessage } from "./encryption";

export type KeyMeta = { salt: string, version: number };

export async function getOrCreateKeyMeta(userId: string): Promise<KeyMeta> {
  const result = await db
    .select({ salt: keys.salt, version: keys.version })
    .from(keys)
    .where(eq(keys.userId, userId))
    .limit(1);

  if (result.length > 0) {
    return { salt: result[0].salt, version: result[0].version };
  }

  const salt = randomBytes(32).toString("hex");
  await db.insert(keys).values({ userId, salt, version: 1 });
  return { salt, version: 1 };
}

export async function getKeyMeta(userId: string): Promise<KeyMeta | undefined> {
  const result = await db
    .select({ salt: keys.salt, version: keys.version })
    .from(keys)
    .where(eq(keys.userId, userId))
    .limit(1);

  if (result.length === 0) return undefined;
  return { salt: result[0].salt, version: result[0].version };
}

export async function rotateKey(userId: string): Promise<void> {
  const oldMeta = await getKeyMeta(userId);
  if (!oldMeta) throw new Error("User has no encryption key to rotate");

  const version = oldMeta.version + 1;
  const salt = randomBytes(32).toString("hex");

  await db.transaction(async (tx) => {
    const chatMessages = await tx
      .select({
        messageId: messages.id,
        ciphertext: messages.ciphertext,
        threadId: messages.threadId,
      })
      .from(messages)
      .innerJoin(threads, eq(messages.threadId, threads.id))
      .where(eq(threads.userId, userId));

    for (const msg of chatMessages) {
      if (!msg.ciphertext) continue;
      const oldContent = decryptMessage(msg.ciphertext, userId, oldMeta.salt);
      const newContent = encryptMessage(oldContent, userId, salt);

      await tx
        .update(messages)
        .set({ ciphertext: newContent, keyVersion: version })
        .where(eq(messages.id, msg.messageId));
    }

    await tx
      .update(keys)
      .set({ salt, version, rotatedAt: new Date() })
      .where(eq(keys.userId, userId));
  });
}
