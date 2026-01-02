import { desc, eq } from "drizzle-orm";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { db } from "~/lib/db";
import { messages, threads } from "~/lib/db/schema/chat";

/**
 * Get all messages for a thread, ordered by creation time
 *
 * @return {Promise<ChatUIMessage[]>} Array of chat messages
 */
export async function getMessagesByThreadId(threadId: string): Promise<ChatUIMessage[]> {
  const rows = await db
    .select({ id: messages.id, content: messages.content })
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(messages.createdAt);

  return rows.map((row) => {
    const message = row.content as ChatUIMessage;
    // Ensure the message has the correct ID from the database
    return { ...message, id: row.id };
  });
}

/**
 * Save a single message to a thread
 *
 * @param threadId ID of the thread
 * @param message Message to save
 * @return {Promise<void>}
 */
export async function saveMessage(
  threadId: string,
  message: ChatUIMessage,
): Promise<void> {
  const dateNow = new Date();

  // Ensure role is a valid enum value
  const role = message.role as "user" | "assistant" | "system";
  if (!["user", "assistant", "system"].includes(role)) {
    throw new Error(`Invalid role: ${message.role}`);
  }

  await db.transaction(async (tx) => {
    await tx.insert(messages).values({
      threadId,
      role,
      content: message,
    });

    // Update thread's lastMessageAt (conversation engagement time)
    await tx
      .update(threads)
      .set({ lastMessageAt: dateNow, updatedAt: dateNow })
      .where(eq(threads.id, threadId));
  });
}

/**
 * Save multiple messages to a thread
 *
 * @param threadId ID of the thread
 * @param messagesToSave Array of messages to save
 *
 * @return {Promise<void>}
 */
export async function saveMessages(
  threadId: string,
  messagesToSave: ChatUIMessage[],
): Promise<void> {
  if (messagesToSave.length === 0)
    return;

  const dateNow = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(messages).values(
      messagesToSave.map(message => ({
        threadId,
        role: message.role,
        content: message,
      })),
    );

    // Update thread's lastMessageAt (conversation engagement time)
    await tx
      .update(threads)
      .set({ lastMessageAt: dateNow, updatedAt: dateNow })
      .where(eq(threads.id, threadId));
  });
}

/**
 * Create a new thread for a user
 *
 * @param userId ID of the user
 * @return {Promise<string>} The ID of the newly created thread
 */
export async function createThread(userId: string): Promise<string> {
  const result = await db
    .insert(threads)
    .values({
      userId,
    })
    .returning({ id: threads.id });

  return result[0].id;
}

/**
 * Get a thread by ID with basic info
 *
 * @param threadId ID of the thread
 * @return {Promise<any>} Thread info or undefined if not found
 */
export async function getThreadById(threadId: string) {
  const result = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);
  return result[0];
}

/**
 * Get all threads for a user, ordered by most recent conversation first
 *
 * @param userId ID of the user
 * @return {Promise<any[]>} Array of threads
 */
export async function getThreadsByUserId(userId: string) {
  return db
    .select()
    .from(threads)
    .where(eq(threads.userId, userId))
    .orderBy(desc(threads.lastMessageAt));
}
