"use server";

import { headers } from "next/headers";

import type { ChatUIMessage } from "~/features/chat/types";
import type { ThreadIcon } from "~/lib/db/schema/chat";

import { deleteFile } from "~/features/attachments/lib/storage";
import { deleteUserAttachmentsByIds, getThreadStats, listThreadAttachments, resolveUserAttachmentsByStoragePaths } from "~/features/attachments/queries";
import { auth } from "~/features/auth/lib/auth";
import { createThreadWithLimitCheck, deleteMessagesAfterCount, deleteThreadById, getMessagesByThreadId, renameThreadById, saveMessage, updateThreadIcon } from "~/features/chat/queries";
import { generateThreadIcon, generateThreadTitle } from "~/features/chat/server/thread";
import { getShareByThreadId, revokeThreadShare, upsertThreadShare } from "~/features/chat/sharing-queries";
import { resolveKey } from "~/lib/api-keys/server";
import { serverEnv } from "~/lib/env";

function extractStoragePathsFromThreadMessages(messages: ChatUIMessage[]): string[] {
  const storagePaths: string[] = [];
  const prefix = `${serverEnv.R2_PUBLIC_URL}/`;

  for (const message of messages) {
    const parts = (message as unknown as { parts?: unknown }).parts;
    if (!Array.isArray(parts))
      continue;

    for (const part of parts) {
      if (!part || typeof part !== "object")
        continue;

      const maybe = part as { type?: unknown; storagePath?: unknown; url?: unknown };
      if (maybe.type !== "file")
        continue;

      if (typeof maybe.storagePath === "string" && maybe.storagePath.length > 0) {
        storagePaths.push(maybe.storagePath);
        continue;
      }

      if (typeof maybe.url === "string" && maybe.url.startsWith(prefix)) {
        storagePaths.push(maybe.url.slice(prefix.length));
      }
    }
  }

  return Array.from(new Set(storagePaths));
}

/**
 * Creates a new thread for the authenticated user (idempotent).
 * Accepts an optional client-generated threadId for optimistic updates.
 *
 * @param options Options for thread creation
 * @param options.threadId Optional client-generated thread ID
 * @param options.title Optional thread title
 * @param options.icon Optional thread icon
 * @returns {Promise<string>} The ID of the newly created thread.
 * @throws {Error} If user is not authenticated.
 */
export async function createNewThread(options?: {
  threadId?: string;
  title?: string;
  icon?: ThreadIcon;
}): Promise<{ threadId: string } | { error: string; code: "THREAD_LIMIT_EXCEEDED"; currentUsage: number; limit: number }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user)
    throw new Error("Not authenticated");

  const result = await createThreadWithLimitCheck(session.user.id, {
    threadId: options?.threadId,
    title: options?.title || "New Thread",
    icon: options?.icon,
  });

  if (!result.ok) {
    return {
      error: result.reason,
      code: "THREAD_LIMIT_EXCEEDED",
      currentUsage: result.currentUsage,
      limit: result.limit,
    };
  }

  return { threadId: result.threadId };
}

/**
 * Saves a user message to the specified thread.
 * Ownership is verified atomically by the saveMessage query.
 *
 * @param threadId ID of the thread
 * @param message Message to save
 * @return {Promise<void>}
 */
export async function saveUserMessage(threadId: string, message: ChatUIMessage): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  await saveMessage(threadId, session.user.id, message);
}

/**
 * Deletes a thread for the authenticated user.
 * Ownership is verified atomically by the deleteThreadById query.
 *
 * @param threadId ID of the thread to delete
 * @return {Promise<void>}
 */
export async function deleteThread(threadId: string): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;

  // Fetch messages and linked attachments in parallel
  const [threadMessages, fromLinked] = await Promise.all([
    getMessagesByThreadId(threadId),
    listThreadAttachments({ userId, threadId }),
  ]);

  // Extract storage paths from message content (only if there are messages)
  const extractedPaths = extractStoragePathsFromThreadMessages(threadMessages);

  // Only resolve paths if we found any in message content
  let fromMessageUrls = { ids: [] as string[], storagePaths: [] as string[] };
  if (extractedPaths.length > 0) {
    fromMessageUrls = await resolveUserAttachmentsByStoragePaths({
      userId,
      storagePaths: extractedPaths,
    });
  }

  const ids = Array.from(new Set([...fromLinked.ids, ...fromMessageUrls.ids]));
  const storagePaths = Array.from(new Set([...fromLinked.storagePaths, ...fromMessageUrls.storagePaths]));

  // Run file deletion, attachment record deletion, and thread deletion in parallel
  // Thread deletion will cascade to messages, which is safe since we've already extracted attachment info
  const cleanupPromises: Promise<unknown>[] = [];

  if (storagePaths.length > 0) {
    cleanupPromises.push(
      Promise.all(storagePaths.map(p => deleteFile(p))),
    );
  }

  if (ids.length > 0) {
    cleanupPromises.push(
      deleteUserAttachmentsByIds({ userId, ids }),
    );
  }

  cleanupPromises.push(
    deleteThreadById(threadId, userId),
  );

  await Promise.all(cleanupPromises);
}

/**
 * Renames a thread for the authenticated user.
 * Ownership is verified atomically by the renameThreadById query.
 *
 * @param threadId ID of the thread to rename
 * @param newTitle New title for the thread
 * @return {Promise<void>}
 */
export async function renameThread(threadId: string, newTitle: string): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const renamed = await renameThreadById(threadId, session.user.id, newTitle);
  if (!renamed) {
    throw new Error("Thread not found or unauthorized");
  }
}

/**
 * Updates the icon for a thread.
 * Ownership is verified atomically by the updateThreadIcon query.
 *
 * @param threadId ID of the thread to update
 * @param icon New icon for the thread
 * @return {Promise<void>}
 */
export async function setThreadIcon(threadId: string, icon: ThreadIcon): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const updated = await updateThreadIcon(threadId, session.user.id, icon);
  if (!updated) {
    throw new Error("Thread not found or unauthorized");
  }
}

/**
 * Regenerates the title of a thread using AI.
 * Requires either a server-stored API key or a client-provided key.
 * Ownership is verified atomically by the renameThreadById query.
 *
 * @param threadId ID of the thread to rename
 * @param clientKey Optional API key provided by the client (from localStorage)
 * @return {Promise<string>} The new title
 */
export async function regenerateThreadName(threadId: string, clientKey?: string, useAllMessages = false): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;

  // Fetch API key and messages in parallel
  const [openrouterKey, threadMessages] = await Promise.all([
    resolveKey(userId, "openrouter", clientKey),
    getMessagesByThreadId(threadId),
  ]);

  if (!openrouterKey) {
    throw new Error("No API key configured. Provide a browser key or store one on the server.");
  }

  const textMessages = threadMessages.filter(m => m.role === "user");

  if (textMessages.length === 0) {
    throw new Error("No user messages found to generate title from");
  }

  let userContent: string;
  if (useAllMessages) {
    userContent = textMessages
      .map((m) => {
        if (!m.parts)
          return "";
        return m.parts
          .filter(p => p.type === "text")
          .map(p => (p as { text: string }).text)
          .join("");
      })
      .filter(Boolean)
      .join("\n\n");
  }
  else {
    const firstUserMessage = textMessages[0];
    userContent = firstUserMessage.parts
      ? firstUserMessage.parts
          .filter(p => p.type === "text")
          .map(p => (p as { text: string }).text)
          .join("")
      : "";
  }

  const newTitle = await generateThreadTitle(userContent, openrouterKey);

  const renamed = await renameThreadById(threadId, userId, newTitle);
  if (!renamed) {
    throw new Error("Thread not found or unauthorized");
  }

  return newTitle;
}

/**
 * Regenerates the icon of a thread using AI.
 * Requires either a server-stored API key or a client-provided key.
 * Ownership is verified atomically by the updateThreadIcon query.
 *
 * @param threadId ID of the thread to update
 * @param clientKey Optional API key provided by the client (from localStorage)
 * @return {Promise<ThreadIcon>} The new icon
 */
export async function regenerateThreadIcon(threadId: string, clientKey?: string): Promise<ThreadIcon> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;

  const [openrouterKey, threadMessages] = await Promise.all([
    resolveKey(userId, "openrouter", clientKey),
    getMessagesByThreadId(threadId),
  ]);

  if (!openrouterKey) {
    throw new Error("No API key configured. Provide a browser key or store one on the server.");
  }

  const textMessages = threadMessages.filter(m => m.role === "user");

  if (textMessages.length === 0) {
    throw new Error("No user messages found to generate icon from");
  }

  const firstUserMessage = textMessages[0];
  const userContent = firstUserMessage.parts
    ? firstUserMessage.parts
        .filter(p => p.type === "text")
        .map(p => (p as { text: string }).text)
        .join("")
    : "";

  const newIcon = await generateThreadIcon(userContent, openrouterKey);

  const updated = await updateThreadIcon(threadId, userId, newIcon);
  if (!updated) {
    throw new Error("Thread not found or unauthorized");
  }

  return newIcon;
}

/**
 * Fetches stats for a thread (message count, attachment count/size, total cost).
 *
 * @param threadId ID of the thread
 * @returns Thread stats
 */
export async function fetchThreadStats(threadId: string): Promise<{
  messageCount: number;
  attachmentCount: number;
  attachmentSize: number;
  totalCost: number;
}> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return getThreadStats({ userId: session.user.id, threadId });
}

/**
 * Deletes messages from a thread, keeping only the first N messages.
 * Used for regenerating responses - keeps messages up to a certain point and deletes the rest.
 * Ownership is enforced at the DB layer by deleteMessagesAfterCount.
 *
 * @param threadId ID of the thread
 * @param keepCount Number of messages to keep (from the beginning)
 * @returns Number of messages deleted
 */
export async function truncateThreadMessages(threadId: string, keepCount: number): Promise<number> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return deleteMessagesAfterCount(threadId, session.user.id, keepCount);
}

/**
 * Deletes attachments by their IDs.
 * Used when editing a message and removing some attachments.
 *
 * @param attachmentIds Array of attachment IDs to delete
 * @returns Promise<void>
 */
export async function deleteMessageAttachmentsByIds(attachmentIds: string[]): Promise<void> {
  if (attachmentIds.length === 0)
    return;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;

  // Delete from database; any returned rows from deleteUserAttachmentsByIds are ignored here.
  // The API endpoint already handles R2 deletion, so we just need to delete from DB.
  await deleteUserAttachmentsByIds({ userId, ids: attachmentIds });
}

/**
 * Creates or updates a share link for a thread.
 * If already shared (even if revoked), updates settings and un-revokes.
 *
 * @param threadId ID of the thread to share
 * @param showAttachments Whether to show attachment content
 * @returns The share ID and share URL
 */
export async function createOrUpdateThreadShare(
  threadId: string,
  showAttachments: boolean,
): Promise<{ shareId: string; shareUrl: string }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const { shareId } = await upsertThreadShare(threadId, session.user.id, showAttachments);

  return {
    shareId,
    shareUrl: `/share/${shareId}`,
  };
}

/**
 * Gets the current share status for a thread.
 *
 * @param threadId ID of the thread
 * @returns Share info or null if not shared
 */
export async function getThreadShareStatus(threadId: string): Promise<{
  shareId: string;
  shareUrl: string;
  showAttachments: boolean;
  isRevoked: boolean;
} | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const share = await getShareByThreadId(threadId, session.user.id);

  if (!share) {
    return null;
  }

  return {
    shareId: share.shareId,
    shareUrl: `/share/${share.shareId}`,
    showAttachments: share.showAttachments,
    isRevoked: share.isRevoked,
  };
}

/**
 * Revokes sharing for a thread.
 *
 * @param threadId ID of the thread
 * @returns True if revoked, false if not found or already revoked
 */
export async function stopSharingThread(threadId: string): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return revokeThreadShare(threadId, session.user.id);
}
