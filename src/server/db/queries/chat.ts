import { and, desc, eq, inArray, lt } from "drizzle-orm";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { db } from "~/lib/db";
import { attachments, messages, threads } from "~/lib/db/schema/chat";
import { serverEnv } from "~/lib/env";

// Performance logging helper
function logTiming(operation: string, startTime: number, metadata?: Record<string, unknown>) {
  const duration = Date.now() - startTime;
  console.warn(`[PERF] ${operation}: ${duration}ms`, metadata ? JSON.stringify(metadata) : "");
}

function extractAttachmentRefs(message: ChatUIMessage): { ids: string[]; storagePaths: string[] } {
  const parts = (message as unknown as { parts?: unknown }).parts;
  if (!Array.isArray(parts))
    return { ids: [], storagePaths: [] };

  const ids: string[] = [];
  const storagePaths: string[] = [];

  for (const part of parts) {
    if (!part || typeof part !== "object")
      continue;

    const maybe = part as { type?: unknown; id?: unknown; storagePath?: unknown; url?: unknown };
    if (maybe.type !== "file")
      continue;

    if (typeof maybe.id === "string" && maybe.id.length > 0)
      ids.push(maybe.id);

    if (typeof maybe.storagePath === "string" && maybe.storagePath.length > 0) {
      storagePaths.push(maybe.storagePath);
      continue;
    }

    if (typeof maybe.url === "string" && maybe.url.length > 0) {
      try {
        const parsed = new URL(maybe.url);
        const prefix = `${serverEnv.R2_PUBLIC_URL}/`;
        if (maybe.url.startsWith(prefix)) {
          storagePaths.push(maybe.url.slice(prefix.length));
        }
        else if (parsed.origin === new URL(serverEnv.R2_PUBLIC_URL).origin) {
          storagePaths.push(parsed.pathname.replace(/^\//, ""));
        }
      }
      catch {
        // ignore
      }
    }
  }

  return {
    ids: Array.from(new Set(ids)),
    storagePaths: Array.from(new Set(storagePaths)),
  };
}

/**
 * Get all messages for a thread, ordered by creation time
 *
 * @return {Promise<ChatUIMessage[]>} Array of chat messages
 */
export async function getMessagesByThreadId(threadId: string): Promise<ChatUIMessage[]> {
  const start = Date.now();
  const rows = await db
    .select({ id: messages.id, content: messages.content })
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(messages.createdAt);
  logTiming("db.getMessagesByThreadId", start, { count: rows.length });

  return rows.map((row) => {
    const message = row.content as ChatUIMessage;
    // Ensure the message has the correct ID from the database
    return { ...message, id: row.id };
  });
}

/**
 * Check if a thread exists and is owned by the given user
 *
 * @param threadId ID of the thread
 * @param userId ID of the user
 * @return {Promise<boolean>} True if thread exists and is owned by user
 */
export async function isThreadOwnedByUser(threadId: string, userId: string): Promise<boolean> {
  const result = await db
    .select({ id: threads.id })
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
    .limit(1);
  return result.length > 0;
}

/**
 * Save a single message to a thread
 *
 * @param threadId ID of the thread
 * @param userId ID of the user
 * @param message Message to save
 * @return {Promise<void>}
 */
export async function saveMessage(
  threadId: string,
  userId: string,
  message: ChatUIMessage,
): Promise<void> {
  const dateNow = new Date();

  // Ensure role is a valid enum value
  const role = message.role as "user" | "assistant" | "system";
  if (!["user", "assistant", "system"].includes(role)) {
    throw new Error(`Invalid role: ${message.role}`);
  }

  const { ids: attachmentIds, storagePaths: attachmentStoragePaths } = extractAttachmentRefs(message);

  await db.transaction(async (tx) => {
    const inserted = await tx.insert(messages).values({
      threadId,
      role,
      content: message,
    }).returning();

    const messageId = inserted[0]?.id;
    if (messageId) {
      if (attachmentIds.length > 0) {
        await tx
          .update(attachments)
          .set({ messageId })
          .where(and(eq(attachments.userId, userId), inArray(attachments.id, attachmentIds)));
      }

      if (attachmentStoragePaths.length > 0) {
        await tx
          .update(attachments)
          .set({ messageId })
          .where(and(eq(attachments.userId, userId), inArray(attachments.storagePath, attachmentStoragePaths)));
      }
    }

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
 * @param title Optional thread title (uses user's default setting if not provided)
 * @return {Promise<string>} The ID of the newly created thread
 */
export async function createThread(userId: string, title?: string): Promise<string> {
  const start = Date.now();
  const now = new Date();
  const result = await db
    .insert(threads)
    .values({
      userId,
      title: title || "New Chat", // Default will be overridden in the action
      lastMessageAt: now,
    })
    .returning();
  logTiming("db.createThread", start);

  return result[0].id;
}

/**
 * Get a thread by ID with basic info
 *
 * @param threadId ID of the thread
 * @return {Promise<any>} Thread info or undefined if not found
 */
export async function getThreadById(threadId: string) {
  const start = Date.now();
  const result = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);
  logTiming("db.getThreadById", start);
  return result[0];
}

/**
 * Get paginated threads for a user, sorted by last message (most recent first)
 *
 * @param userId ID of the user
 * @param options.limit Number of threads to fetch (default 50)
 * @param options.cursor Cursor for pagination (lastMessageAt of last thread from previous page)
 * @return {Promise<{ threads: any[]; nextCursor: string | null }>}
 */
export async function getThreadsByUserId(
  userId: string,
  options: { limit?: number; cursor?: string } = {},
) {
  const { limit = 50, cursor } = options;
  const start = Date.now();

  const conditions = [eq(threads.userId, userId)];

  if (cursor) {
    const cursorDate = new Date(cursor);
    conditions.push(lt(threads.lastMessageAt, cursorDate));
  }

  const result = await db
    .select()
    .from(threads)
    .where(and(...conditions))
    .orderBy(desc(threads.lastMessageAt))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  const threadList = hasMore ? result.slice(0, limit) : result;
  const nextCursor = hasMore && threadList.length > 0
    ? threadList[threadList.length - 1].lastMessageAt?.toISOString() ?? null
    : null;

  logTiming("db.getThreadsByUserId", start, { count: threadList.length, hasMore });

  return { threads: threadList, nextCursor };
}

/**
 * Delete a thread by ID (cascades to delete associated messages)
 * Verifies ownership by requiring userId in the WHERE clause.
 *
 * @param threadId ID of the thread to delete
 * @param userId ID of the user who owns the thread
 * @return {Promise<boolean>} True if deleted, false if not found or not owned
 */
export async function deleteThreadById(threadId: string, userId: string): Promise<boolean> {
  const start = Date.now();
  const result = await db
    .delete(threads)
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
    .returning();
  logTiming("db.deleteThreadById", start);
  return result.length > 0;
}

/**
 * Rename a thread by ID
 * Verifies ownership by requiring userId in the WHERE clause.
 *
 * @param threadId ID of the thread to rename
 * @param userId ID of the user who owns the thread
 * @param newTitle New title for the thread
 * @return {Promise<boolean>} True if renamed, false if not found or not owned
 */
export async function renameThreadById(threadId: string, userId: string, newTitle: string): Promise<boolean> {
  const result = await db
    .update(threads)
    .set({ title: newTitle, updatedAt: new Date() })
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
    .returning();
  return result.length > 0;
}
