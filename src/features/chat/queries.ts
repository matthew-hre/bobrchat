import type Buffer from "node:buffer";

import { and, count, desc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { cache } from "react";

import type { ChatUIMessage } from "~/features/chat/types";
import type { ThreadIcon } from "~/lib/db/schema/chat";

import { db } from "~/lib/db";
import { attachments, messageMetadata, messages, threads } from "~/lib/db/schema/chat";
import { threadShares } from "~/lib/db/schema/sharing";
import { subscriptions, TIER_LIMITS } from "~/lib/db/schema/subscriptions";
import { serverEnv } from "~/lib/env";
import { decryptMessageWithKey, deriveUserKey, encryptMessage } from "~/lib/security/encryption";
import { getKeyMeta, getOrCreateKeyMeta, getSaltsForUser } from "~/lib/security/keys";

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
 * Cached per-request using React cache() for deduplication.
 *
 * @return {Promise<ChatUIMessage[]>} Array of chat messages
 */
export const getMessagesByThreadId = cache(async (threadId: string): Promise<ChatUIMessage[]> => {
  const thread = await db
    .select({ userId: threads.userId })
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);

  if (thread.length === 0)
    return [];
  const userId = thread[0].userId;
  const [keyMeta, saltsByVersion] = await Promise.all([
    getKeyMeta(userId),
    getSaltsForUser(userId),
  ]);

  const rows = await db
    .select({
      id: messages.id,
      content: messages.content,
      iv: messages.iv,
      ciphertext: messages.ciphertext,
      authTag: messages.authTag,
      keyVersion: messages.keyVersion,
      searchEnabled: messages.searchEnabled,
      reasoningLevel: messages.reasoningLevel,
      modelId: messages.modelId,
      // Metadata from message_metadata table
      metaModel: messageMetadata.model,
      metaInputTokens: messageMetadata.inputTokens,
      metaOutputTokens: messageMetadata.outputTokens,
      metaCostTotalUsd: messageMetadata.costTotalUsd,
      metaCostBreakdown: messageMetadata.costBreakdown,
      metaTokensPerSecond: messageMetadata.tokensPerSecond,
      metaTimeToFirstTokenMs: messageMetadata.timeToFirstTokenMs,
    })
    .from(messages)
    .leftJoin(messageMetadata, eq(messages.id, messageMetadata.messageId))
    .where(eq(messages.threadId, threadId))
    .orderBy(messages.createdAt);

  const derivedKeys = new Map<number, Buffer>();

  return Promise.all(rows.map(async (row) => {
    let message: ChatUIMessage;

    if (row.iv && row.ciphertext && row.authTag && keyMeta) {
      const version = row.keyVersion ?? keyMeta.version;
      const salt = saltsByVersion.get(version);
      if (!salt) {
        throw new Error(`Missing salt for key version ${version}`);
      }
      const cachedKey = derivedKeys.get(version) ?? deriveUserKey(userId, salt);
      derivedKeys.set(version, cachedKey);
      message = decryptMessageWithKey(
        { iv: row.iv, ciphertext: row.ciphertext, authTag: row.authTag },
        cachedKey,
      );
    }
    else {
      message = row.content as ChatUIMessage;
    }

    // Build metadata from message_metadata table if available
    const metadata = row.metaModel
      ? {
          model: row.metaModel,
          inputTokens: row.metaInputTokens ?? 0,
          outputTokens: row.metaOutputTokens ?? 0,
          tokensPerSecond: row.metaTokensPerSecond ? Number.parseFloat(row.metaTokensPerSecond) : 0,
          timeToFirstTokenMs: row.metaTimeToFirstTokenMs ?? 0,
          costUSD: row.metaCostBreakdown
            ? {
                ...row.metaCostBreakdown,
                total: row.metaCostTotalUsd ? Number.parseFloat(row.metaCostTotalUsd) : 0,
              }
            : {
                promptCost: 0,
                completionCost: 0,
                search: 0,
                extract: 0,
                ocr: 0,
                total: row.metaCostTotalUsd ? Number.parseFloat(row.metaCostTotalUsd) : 0,
              },
        }
      : undefined;

    return {
      ...message,
      id: row.id,
      searchEnabled: row.searchEnabled,
      reasoningLevel: row.reasoningLevel,
      modelId: row.modelId,
      metadata,
    };
  }));
});

/**
 * Save a single message to a thread
 *
 * @param threadId ID of the thread
 * @param userId ID of the user
 * @param message Message to save
 * @param options Optional settings
 * @param options.searchEnabled Whether search was enabled for this message
 * @param options.reasoningLevel The reasoning level used for this message
 * @param options.modelId The model ID used for this message
 * @return {Promise<void>}
 */
export async function saveMessage(
  threadId: string,
  userId: string,
  message: ChatUIMessage,
  options?: { searchEnabled?: boolean; reasoningLevel?: string; modelId?: string },
): Promise<void> {
  const dateNow = new Date();

  // Ensure role is a valid enum value
  const role = message.role as "user" | "assistant" | "system";
  if (!["user", "assistant", "system"].includes(role)) {
    throw new Error(`Invalid role: ${message.role}`);
  }

  const { ids: attachmentIds, storagePaths: attachmentStoragePaths } = extractAttachmentRefs(message);

  const keyMeta = await getOrCreateKeyMeta(userId);
  const encrypted = encryptMessage(message, userId, keyMeta.salt);

  await db.transaction(async (tx) => {
    const messageId = crypto.randomUUID();

    await tx.insert(messages).values({
      id: messageId,
      threadId,
      role,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      authTag: encrypted.authTag,
      content: null,
      keyVersion: keyMeta.version,
      searchEnabled: options?.searchEnabled,
      reasoningLevel: options?.reasoningLevel,
      modelId: options?.modelId,
    });

    // Insert metadata for assistant messages (user messages don't have cost/token info)
    if (role === "assistant" && message.metadata) {
      const meta = message.metadata;
      await tx.insert(messageMetadata).values({
        messageId,
        model: meta.model,
        inputTokens: meta.inputTokens,
        outputTokens: meta.outputTokens,
        costTotalUsd: meta.costUSD?.total?.toString(),
        costBreakdown: meta.costUSD
          ? {
              promptCost: meta.costUSD.promptCost,
              completionCost: meta.costUSD.completionCost,
              search: meta.costUSD.search,
              extract: meta.costUSD.extract,
              ocr: meta.costUSD.ocr,
            }
          : undefined,
        tokensPerSecond: meta.tokensPerSecond?.toString(),
        timeToFirstTokenMs: meta.timeToFirstTokenMs,
      });
    }

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

    // Update thread's lastMessageAt (thread engagement time)
    // Includes userId in WHERE clause to enforce ownership at the DB layer
    await tx
      .update(threads)
      .set({ lastMessageAt: dateNow, updatedAt: dateNow })
      .where(and(eq(threads.id, threadId), eq(threads.userId, userId)));
  });
}

/**
 * Save multiple messages to a thread
 *
 * @param threadId ID of the thread
 * @param userId ID of the user
 * @param messagesToSave Array of messages to save
 *
 * @return {Promise<void>}
 */
export async function saveMessages(
  threadId: string,
  userId: string,
  messagesToSave: ChatUIMessage[],
): Promise<void> {
  if (messagesToSave.length === 0)
    return;

  const dateNow = new Date();
  const keyMeta = await getOrCreateKeyMeta(userId);

  await db.transaction(async (tx) => {
    await tx.insert(messages).values(
      messagesToSave.map((message) => {
        const encrypted = encryptMessage(message, userId, keyMeta.salt);
        return {
          threadId,
          role: message.role,
          content: null,
          iv: encrypted.iv,
          ciphertext: encrypted.ciphertext,
          authTag: encrypted.authTag,
          keyVersion: keyMeta.version,
        };
      }),
    );

    // Update thread's lastMessageAt (thread engagement time)
    await tx
      .update(threads)
      .set({ lastMessageAt: dateNow, updatedAt: dateNow })
      .where(eq(threads.id, threadId));
  });
}

/**
 * Create a new thread for a user (idempotent)
 *
 * @param userId ID of the user
 * @param options Options for thread creation
 * @param options.threadId Optional ID for the thread (if not provided, a new UUID is generated)
 * @param options.title Optional title for the thread
 * @param options.icon Optional icon for the thread
 * @return {Promise<string>} The ID of the thread (created or existing)
 */
export async function createThread(
  userId: string,
  options?: { threadId?: string; title?: string; icon?: ThreadIcon },
): Promise<string> {
  const now = new Date();
  const threadId = options?.threadId ?? crypto.randomUUID();
  const title = options?.title || "New Thread";

  await db
    .insert(threads)
    .values({
      id: threadId,
      userId,
      title,
      icon: options?.icon,
      lastMessageAt: now,
    })
    .onConflictDoNothing({ target: threads.id });

  return threadId;
}

export async function createThreadWithLimitCheck(
  userId: string,
  options?: { threadId?: string; title?: string; icon?: ThreadIcon },
): Promise<
  | { ok: true; threadId: string }
  | { ok: false; reason: string; currentUsage: number; limit: number }
> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM subscriptions WHERE user_id = ${userId} FOR UPDATE`);

    const subRow = await tx
      .select({ tier: subscriptions.tier })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    const tier = subRow[0]?.tier ?? "free";
    const threadLimit = TIER_LIMITS[tier].threads;

    const threadCountResult = await tx
      .select({ count: count() })
      .from(threads)
      .where(eq(threads.userId, userId));

    const currentCount = threadCountResult[0]?.count ?? 0;

    if (threadLimit !== null && currentCount >= threadLimit) {
      return {
        ok: false as const,
        reason: `You've reached your limit of ${threadLimit} threads. Delete some threads or upgrade to continue.`,
        currentUsage: currentCount,
        limit: threadLimit,
      };
    }

    const now = new Date();
    const threadId = options?.threadId ?? crypto.randomUUID();
    const title = options?.title || "New Thread";

    await tx
      .insert(threads)
      .values({
        id: threadId,
        userId,
        title,
        icon: options?.icon,
        lastMessageAt: now,
      })
      .onConflictDoNothing({ target: threads.id });

    return { ok: true as const, threadId };
  });
}

/**
 * Ensure a thread exists for a user, creating it if missing.
 * Returns ownership status.
 *
 * @param threadId ID of the thread
 * @param userId ID of the user
 * @param title Optional title for new threads
 * @return {Promise<{ exists: boolean; owned: boolean; created: boolean }>}
 */
export async function ensureThreadExists(
  threadId: string,
  userId: string,
  title?: string,
): Promise<{ exists: boolean; owned: boolean; created: boolean }> {
  const existing = await db
    .select({ id: threads.id, userId: threads.userId })
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);

  if (existing.length > 0) {
    return {
      exists: true,
      owned: existing[0].userId === userId,
      created: false,
    };
  }

  const now = new Date();
  await db.insert(threads).values({
    id: threadId,
    userId,
    title: title || "New Thread",
    lastMessageAt: now,
  });

  return { exists: true, owned: true, created: true };
}

/**
 * Get a thread by ID with basic info
 * Cached per-request using React cache() for deduplication.
 *
 * @param threadId ID of the thread
 * @return {Promise<any>} Thread info or undefined if not found
 */
export const getThreadById = cache(async (threadId: string) => {
  const result = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);
  return result[0];
});

/**
 * Get parent thread info for a thread (if it has one)
 * Cached per-request using React cache() for deduplication.
 *
 * @param threadId ID of the thread to get parent for
 * @return {Promise<{ id: string; title: string } | null>} Parent thread info or null
 */
export const getParentThread = cache(async (threadId: string) => {
  const thread = await getThreadById(threadId);
  if (!thread?.parentThreadId) {
    return null;
  }

  const parent = await db
    .select({ id: threads.id, title: threads.title })
    .from(threads)
    .where(eq(threads.id, thread.parentThreadId))
    .limit(1);

  return parent[0] || null;
});

/**
 * Get paginated threads for a user, sorted by last message (most recent first)
 *
 * @param userId ID of the user
 * @param options Options for pagination and filtering
 * @param options.limit Number of threads to fetch (default 50)
 * @param options.cursor Cursor for pagination (lastMessageAt of last thread from previous page)
 * @param options.archived Whether to fetch archived threads (default false)
 * @return {Promise<{ threads: any[]; nextCursor: string | null }>}
 */
export async function getThreadsByUserId(
  userId: string,
  options: { limit?: number; cursor?: string; archived?: boolean } = {},
) {
  const { limit = 50, cursor, archived = false } = options;

  const conditions = [
    eq(threads.userId, userId),
    archived ? isNotNull(threads.archivedAt) : isNull(threads.archivedAt),
  ];

  if (cursor) {
    const cursorDate = new Date(cursor);
    conditions.push(lt(threads.lastMessageAt, cursorDate));
  }

  const result = await db
    .select({
      id: threads.id,
      title: threads.title,
      icon: threads.icon,
      lastMessageAt: threads.lastMessageAt,
      userId: threads.userId,
      createdAt: threads.createdAt,
      updatedAt: threads.updatedAt,
      isShared: isNotNull(threadShares.id),
      isShareRevoked: isNotNull(threadShares.revokedAt),
    })
    .from(threads)
    .leftJoin(threadShares, eq(threads.id, threadShares.threadId))
    .where(and(...conditions))
    .orderBy(desc(threads.lastMessageAt))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  const threadList = hasMore ? result.slice(0, limit) : result;
  const nextCursor = hasMore && threadList.length > 0
    ? threadList[threadList.length - 1].lastMessageAt?.toISOString() ?? null
    : null;

  const threadsWithShareStatus = threadList.map(t => ({
    ...t,
    isShared: t.isShared && !t.isShareRevoked,
  }));

  return { threads: threadsWithShareStatus, nextCursor };
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
  const result = await db
    .delete(threads)
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
    .returning();
  return Array.isArray(result) && result.length > 0;
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

/**
 * Updates the icon for a thread.
 * Ownership is verified atomically.
 *
 * @param threadId ID of the thread to update
 * @param userId ID of the user who owns the thread
 * @param icon New icon for the thread
 * @return {Promise<boolean>} True if updated, false if not found or not owned
 */
export async function updateThreadIcon(threadId: string, userId: string, icon: ThreadIcon): Promise<boolean> {
  const result = await db
    .update(threads)
    .set({ icon, updatedAt: new Date() })
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
    .returning();
  return result.length > 0;
}

/**
 * Archive or unarchive a thread by ID.
 * Verifies ownership by requiring userId in the WHERE clause.
 *
 * @param threadId ID of the thread
 * @param userId ID of the user who owns the thread
 * @param archive True to archive, false to unarchive
 * @return {Promise<boolean>} True if updated, false if not found or not owned
 */
export async function archiveThreadById(threadId: string, userId: string, archive: boolean): Promise<boolean> {
  const result = await db
    .update(threads)
    .set({ archivedAt: archive ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
    .returning();
  return result.length > 0;
}

/**
 * Delete messages from a thread, keeping only the first N messages.
 * Used for regeneration - keeps messages up to a certain point and deletes the rest.
 * Enforces ownership by joining on threads table.
 *
 * @param threadId ID of the thread
 * @param userId ID of the user (for ownership verification)
 * @param keepCount Number of messages to keep (from the beginning)
 * @returns Number of messages deleted, or 0 if thread not owned
 */
export async function deleteMessagesAfterCount(threadId: string, userId: string, keepCount: number): Promise<number> {
  // Get all message IDs for this thread, but only if user owns the thread
  const allMessages = await db
    .select({ id: messages.id })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .where(and(eq(messages.threadId, threadId), eq(threads.userId, userId)))
    .orderBy(messages.createdAt);

  // Determine which messages to delete (everything after keepCount)
  const messagesToDelete = allMessages.slice(keepCount);

  if (messagesToDelete.length === 0) {
    return 0;
  }

  const idsToDelete = messagesToDelete.map(m => m.id);

  // Delete the messages
  const deleted = await db
    .delete(messages)
    .where(inArray(messages.id, idsToDelete))
    .returning();

  return deleted.length;
}
