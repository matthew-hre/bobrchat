"use server";

import { headers } from "next/headers";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { auth } from "~/lib/auth";
import { createThread, saveMessage } from "~/server/db/queries/chat";

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
