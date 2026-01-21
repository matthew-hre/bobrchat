import type { UIMessage } from "ai";
import type { Metadata } from "next";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/features/auth/lib/auth";
import { getMessagesByThreadId, getThreadById } from "~/features/chat/queries";

import ChatThread from "./chat-thread";

type ChatServerProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatServer({ params }: ChatServerProps) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    redirect("/");
  }

  // Verify user is authenticated
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/");
  }

  // Fetch thread and messages in parallel
  const [thread, initialMessages] = await Promise.all([
    getThreadById(id),
    getMessagesByThreadId(id),
  ]);

  // If thread exists, verify ownership
  // If thread doesn't exist, allow access - it will be created on-demand by the chat API
  // (This supports optimistic navigation where client navigates before server creates thread)
  if (thread && thread.userId !== session.user.id) {
    redirect("/");
  }

  // Note: Initial message is now retrieved on the client side from sessionStorage
  // to avoid URL length limits. This is only passed to the component as null here.
  // The client component (chat-thread.tsx) will retrieve it from sessionStorage.
  const initialPendingMessage: UIMessage | null = null;

  return <ChatThread params={Promise.resolve({ id })} initialMessages={initialMessages} initialPendingMessage={initialPendingMessage} />;
}

export async function generateMetadata({ params }: ChatServerProps): Promise<Metadata> {
  const { id } = await params;

  const thread = await getThreadById(id);

  return {
    title: thread ? `${thread.title} - BobrChat` : "Chat",
  };
}
