"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { auth } from "~/lib/auth";
import { createThread, deleteThreadById, renameThreadById, saveMessage } from "~/server/db/queries/chat";
import { hasApiKey } from "~/server/db/queries/settings";
import { validateThreadOwnership } from "~/server/db/utils/thread-validation";

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

  // Check if user has an API key configured
  const hasKey = await hasApiKey(session.user.id, "openrouter");
  if (!hasKey) {
    throw new Error("API key not configured. Please set up your OpenRouter API key in settings before creating a thread.");
  }

  const threadName = defaultName || "New Chat";
  const threadId = await createThread(session.user.id, threadName);
  revalidatePath("/");
  return threadId;
}

/**
 * Saves a user message to the specified thread.
 *
 * @param threadId ID of the thread
 * @param message Message to save
 * @return {Promise<void>}
 */
export async function saveUserMessage(threadId: string, message: ChatUIMessage): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  await validateThreadOwnership(threadId, session);
  await saveMessage(threadId, message);
}

/**
 * Deletes a thread for the authenticated user.
 * Verifies ownership before deletion.
 *
 * @param threadId ID of the thread to delete
 * @return {Promise<void>}
 */
export async function deleteThread(threadId: string): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  await validateThreadOwnership(threadId, session);
  await deleteThreadById(threadId);
  revalidatePath("/");
}

/**
 * Renames a thread for the authenticated user.
 * Verifies ownership before renaming.
 *
 * @param threadId ID of the thread to rename
 * @param newTitle New title for the thread
 * @return {Promise<void>}
 */
export async function renameThread(threadId: string, newTitle: string): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  await validateThreadOwnership(threadId, session);
  await renameThreadById(threadId, newTitle);

  revalidatePath("/");
}
