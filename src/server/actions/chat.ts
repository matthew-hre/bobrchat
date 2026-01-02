"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { auth } from "~/lib/auth";
import { createThread, deleteThreadById, getThreadById, renameThreadById, saveMessage } from "~/server/db/queries/chat";

/**
 * Creates a new chat thread for the authenticated user.
 *
 * @returns {Promise<string>} The ID of the newly created thread.
 */
export async function createNewThread(): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user)
    throw new Error("Not authenticated");

  const threadId = await createThread(session.user.id);
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
  if (!session?.user)
    throw new Error("Not authenticated");

  const thread = await getThreadById(threadId);
  if (!thread)
    throw new Error("Thread not found");

  if (thread.userId !== session.user.id)
    throw new Error("Unauthorized");

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
  if (!session?.user)
    throw new Error("Not authenticated");

  const thread = await getThreadById(threadId);
  if (!thread)
    throw new Error("Thread not found");

  if (thread.userId !== session.user.id)
    throw new Error("Unauthorized");

  await renameThreadById(threadId, newTitle);

  revalidatePath("/");
}
