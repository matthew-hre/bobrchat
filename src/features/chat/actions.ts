"use server";

import { headers } from "next/headers";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { deleteFile } from "~/features/attachments/lib/storage";
import { deleteUserAttachmentsByIds, getThreadStats, listThreadAttachments, resolveUserAttachmentsByStoragePaths } from "~/features/attachments/queries";
import { auth } from "~/features/auth/lib/auth";
import { createThread, deleteThreadById, getMessagesByThreadId, renameThreadById, saveMessage } from "~/features/chat/queries";
import { generateThreadTitle } from "~/features/chat/server/naming";
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
 * Creates a new chat thread for the authenticated user.
 * Requires user to have an API key configured.
 *
 * @param defaultName Optional default thread name (pass from client to avoid DB query)
 * @returns {Promise<string>} The ID of the newly created thread.
 * @throws {Error} If user is not authenticated or doesn't have an API key configured.
 */
export async function createNewThread(defaultName?: string): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user)
    throw new Error("Not authenticated");

  const threadName = defaultName || "New Chat";

  // We used to check if the key existed here, but now we just let the chat service
  // handle missing keys when the user sends a message.
  const threadId = await createThread(session.user.id, threadName);

  return threadId;
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
 * Regenerates the title of a thread using AI.
 * Requires either a server-stored API key or a client-provided key.
 * Ownership is verified atomically by the renameThreadById query.
 *
 * @param threadId ID of the thread to rename
 * @param clientKey Optional API key provided by the client (from localStorage)
 * @return {Promise<string>} The new title
 */
export async function regenerateThreadName(threadId: string, clientKey?: string): Promise<string> {
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

  const firstUserMessage = textMessages[0];
  const userContent = firstUserMessage.parts
    ? firstUserMessage.parts
        .filter(p => p.type === "text")
        .map(p => (p as { text: string }).text)
        .join("")
    : "";

  const newTitle = await generateThreadTitle(userContent, openrouterKey);

  const renamed = await renameThreadById(threadId, userId, newTitle);
  if (!renamed) {
    throw new Error("Thread not found or unauthorized");
  }

  return newTitle;
}

/**
 * Fetches stats for a thread (message count, attachment count/size).
 *
 * @param threadId ID of the thread
 * @returns Thread stats
 */
export async function fetchThreadStats(threadId: string): Promise<{
  messageCount: number;
  attachmentCount: number;
  attachmentSize: number;
}> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return getThreadStats({ userId: session.user.id, threadId });
}
