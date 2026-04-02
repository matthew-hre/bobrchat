"use server";

import type { TagRow } from "~/features/chat/queries";
import type { ChatUIMessage } from "~/features/chat/types";
import type { ApiKeyProvider } from "~/lib/api-keys/types";
import type { ThreadIcon } from "~/lib/db/schema/chat";

import { deleteFile } from "~/features/attachments/lib/storage";
import { deleteUserAttachmentsByIds, getThreadStats, listThreadAttachments } from "~/features/attachments/queries";
import { getRequiredSession } from "~/features/auth/lib/session";
import { addTagToThread, archiveThreadById, createTag, createThreadWithLimitCheck, deleteMessagesAfterCount, deleteTagById, deleteThreadById, getMessagesByThreadId, listTagsByUserId, removeTagFromThread, renameThreadById, saveMessage, updateTagById, updateThreadIcon } from "~/features/chat/queries";
import { resolveToolProvider } from "~/features/chat/server/providers";
import { generateThreadIcon, generateThreadTitle } from "~/features/chat/server/thread";
import { getShareByThreadId, revokeThreadShare, upsertThreadShare } from "~/features/chat/sharing-queries";
import { getUserTier } from "~/features/subscriptions/queries";
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
  const session = await getRequiredSession();

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
  const session = await getRequiredSession();

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
  const session = await getRequiredSession();

  const userId = session.user.id;

  const { ids, storagePaths } = await listThreadAttachments({ userId, threadId });

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
  const session = await getRequiredSession();

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
  const session = await getRequiredSession();

  const updated = await updateThreadIcon(threadId, session.user.id, icon);
  if (!updated) {
    throw new Error("Thread not found or unauthorized");
  }
}

/**
 * Archives or unarchives a thread for the authenticated user.
 * Ownership is verified atomically by the archiveThreadById query.
 *
 * @param threadId ID of the thread to archive/unarchive
 * @param archive True to archive, false to unarchive
 * @return {Promise<void>}
 */
export async function archiveThread(threadId: string, archive: boolean): Promise<void> {
  const session = await getRequiredSession();

  const updated = await archiveThreadById(threadId, session.user.id, archive);
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
 * @param clientKeys Optional API keys provided by the client (from localStorage)
 * @param useAllMessages Optional flag to send all messages for name context, instead of just the initial.
 * @return {Promise<string>} The new title
 */
export async function regenerateThreadName(threadId: string, clientKeys?: Partial<Record<ApiKeyProvider, string>>, useAllMessages = false): Promise<string> {
  const session = await getRequiredSession();

  const userId = session.user.id;

  // Fetch API keys, settings, tier, and messages in parallel
  const { getUserSettingsAndKeys } = await import("~/features/settings/queries");
  const [{ settings, resolvedKeys }, threadMessages, tier] = await Promise.all([
    getUserSettingsAndKeys(userId, clientKeys),
    getMessagesByThreadId(threadId),
    getUserTier(userId),
  ]);

  const utilityProvider = resolveToolProvider(settings.toolTitleModel, resolvedKeys, tier);
  if (!utilityProvider) {
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

  const newTitle = await generateThreadTitle(userContent, utilityProvider, userId);

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
 * @param clientKeys Optional API keys provided by the client (from localStorage)
 * @return {Promise<ThreadIcon>} The new icon
 */
export async function regenerateThreadIcon(threadId: string, clientKeys?: Partial<Record<ApiKeyProvider, string>>): Promise<ThreadIcon> {
  const session = await getRequiredSession();

  const userId = session.user.id;

  const { getUserSettingsAndKeys } = await import("~/features/settings/queries");
  const [{ settings, resolvedKeys }, threadMessages, tier] = await Promise.all([
    getUserSettingsAndKeys(userId, clientKeys),
    getMessagesByThreadId(threadId),
    getUserTier(userId),
  ]);

  const utilityProvider = resolveToolProvider(settings.toolIconModel, resolvedKeys, tier);
  if (!utilityProvider) {
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

  const newIcon = await generateThreadIcon(userContent, utilityProvider, userId);

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
  const session = await getRequiredSession();

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
  const session = await getRequiredSession();

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

  const session = await getRequiredSession();

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
  const session = await getRequiredSession();

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
  const session = await getRequiredSession();

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
  const session = await getRequiredSession();

  return revokeThreadShare(threadId, session.user.id);
}

/**
 * Lists all tags for the authenticated user.
 */
export async function listUserTags(): Promise<TagRow[]> {
  const session = await getRequiredSession();

  return listTagsByUserId(session.user.id);
}

/**
 * Creates a new tag for the authenticated user.
 */
export async function createUserTag(input: { name: string; color: string; description?: string }): Promise<TagRow> {
  const session = await getRequiredSession();

  return createTag(session.user.id, input);
}

/**
 * Deletes a tag for the authenticated user.
 */
export async function deleteUserTag(tagId: string): Promise<void> {
  const session = await getRequiredSession();

  const deleted = await deleteTagById(session.user.id, tagId);
  if (!deleted) {
    throw new Error("Tag not found or unauthorized");
  }
}

/**
 * Updates a tag for the authenticated user.
 */
export async function updateUserTag(tagId: string, input: { name?: string; color?: string; description?: string | null }): Promise<void> {
  const session = await getRequiredSession();

  const updated = await updateTagById(session.user.id, tagId, input);
  if (!updated) {
    throw new Error("Tag not found or unauthorized");
  }
}

/**
 * Adds a tag to a thread for the authenticated user.
 */
export async function tagThread(threadId: string, tagId: string): Promise<void> {
  const session = await getRequiredSession();

  await addTagToThread(session.user.id, threadId, tagId);
}

/**
 * Removes a tag from a thread for the authenticated user.
 */
export async function untagThread(threadId: string, tagId: string): Promise<void> {
  const session = await getRequiredSession();

  await removeTagFromThread(session.user.id, threadId, tagId);
}
