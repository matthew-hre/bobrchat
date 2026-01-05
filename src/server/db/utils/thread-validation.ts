import { getThreadById } from "~/server/db/queries/chat";

/**
 * Validates thread ownership and existence
 *
 * @param threadId ID of the thread to validate
 * @param session User session (can be any session type from better-auth)
 * @throws {Error} If thread not found or user doesn't own it
 * @returns {Promise<any>} The validated thread
 */
export async function validateThreadOwnership(
  threadId: string,
  session: { user?: { id: string } } | null,
) {
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const thread = await getThreadById(threadId);
  if (!thread) {
    throw new Error("Thread not found");
  }

  if (thread.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  return thread;
}
