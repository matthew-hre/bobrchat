"use server";

import { headers } from "next/headers";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { auth } from "~/features/auth/lib/auth";
import { hasKeyConfigured, resolveKey } from "~/lib/api-keys/server";
import { serverEnv } from "~/lib/env";
import { deleteFile } from "~/lib/storage";
import { generateThreadTitle } from "~/server/ai/naming";
import { deleteUserAttachmentsByIds, listThreadAttachments, resolveUserAttachmentsByStoragePaths } from "~/server/db/queries/attachments";
import { createThread, deleteThreadById, getMessagesByThreadId, renameThreadById, saveMessage } from "~/server/db/queries/chat";

// Performance logging helper
function logTiming(operation: string, startTime: number, metadata?: Record<string, unknown>) {
  const duration = Date.now() - startTime;
  console.warn(`[PERF] ${operation}: ${duration}ms`, metadata ? JSON.stringify(metadata) : "");
}

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
  const totalStart = Date.now();

  const sessionStart = Date.now();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  logTiming("createNewThread.getSession", sessionStart);

  if (!session?.user)
    throw new Error("Not authenticated");

  const threadName = defaultName || "New Chat";

  // Run hasKeyConfigured and createThread in parallel to hide cold start latency
  // If user doesn't have an API key, we'll delete the thread (rare case)
  const dbStart = Date.now();
  const [hasKey, threadId] = await Promise.all([
    hasKeyConfigured(session.user.id, "openrouter"),
    createThread(session.user.id, threadName),
  ]);
  logTiming("createNewThread.parallelDbOps", dbStart, { hasKey });

  if (!hasKey) {
    // Rare case: user somehow doesn't have API key, clean up the thread we just created
    await deleteThreadById(threadId, session.user.id);
    throw new Error("API key not configured. Please set up your OpenRouter API key in settings before creating a thread.");
  }

  logTiming("createNewThread.total", totalStart);
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
  const totalStart = Date.now();

  const sessionStart = Date.now();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  logTiming("deleteThread.getSession", sessionStart);

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;

  // Fetch messages and linked attachments in parallel
  const fetchStart = Date.now();
  const [threadMessages, fromLinked] = await Promise.all([
    getMessagesByThreadId(threadId),
    listThreadAttachments({ userId, threadId }),
  ]);
  logTiming("deleteThread.fetchMessagesAndAttachments", fetchStart, {
    messageCount: threadMessages.length,
    linkedAttachmentCount: fromLinked.ids.length,
  });

  // Extract storage paths from message content (only if there are messages)
  const extractedPaths = extractStoragePathsFromThreadMessages(threadMessages);

  // Only resolve paths if we found any in message content
  let fromMessageUrls = { ids: [] as string[], storagePaths: [] as string[] };
  if (extractedPaths.length > 0) {
    const resolveStart = Date.now();
    fromMessageUrls = await resolveUserAttachmentsByStoragePaths({
      userId,
      storagePaths: extractedPaths,
    });
    logTiming("deleteThread.resolveStoragePaths", resolveStart, {
      resolvedCount: fromMessageUrls.ids.length,
    });
  }

  const ids = Array.from(new Set([...fromLinked.ids, ...fromMessageUrls.ids]));
  const storagePaths = Array.from(new Set([...fromLinked.storagePaths, ...fromMessageUrls.storagePaths]));

  // Run file deletion, attachment record deletion, and thread deletion in parallel
  // Thread deletion will cascade to messages, which is safe since we've already extracted attachment info
  const cleanupStart = Date.now();
  const cleanupPromises: Promise<unknown>[] = [];

  if (storagePaths.length > 0) {
    cleanupPromises.push(
      Promise.all(storagePaths.map(p => deleteFile(p)))
        .then(() => logTiming("deleteThread.deleteFiles", cleanupStart, { fileCount: storagePaths.length })),
    );
  }

  if (ids.length > 0) {
    cleanupPromises.push(
      deleteUserAttachmentsByIds({ userId, ids })
        .then(() => logTiming("deleteThread.deleteAttachmentRecords", cleanupStart, { count: ids.length })),
    );
  }

  cleanupPromises.push(
    deleteThreadById(threadId, userId).then((deleted) => {
      logTiming("deleteThread.deleteThreadById", cleanupStart);
      if (!deleted) {
        throw new Error("Thread not found or unauthorized");
      }
    }),
  );

  await Promise.all(cleanupPromises);
  logTiming("deleteThread.total", totalStart);
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
