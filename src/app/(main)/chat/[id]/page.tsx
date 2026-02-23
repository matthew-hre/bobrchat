import type { UIMessage } from "ai";
import type { Metadata } from "next";

import { redirect } from "next/navigation";

import { getSession } from "~/features/auth/lib/session";
import { getMessagesByThreadId, getParentThread, getThreadById } from "~/features/chat/queries";

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
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }

  // Fetch thread, messages, and parent thread in parallel
  const [thread, initialMessages, parentThread] = await Promise.all([
    getThreadById(id),
    getMessagesByThreadId(id),
    getParentThread(id),
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

  // Derive the last-used model from the most recent user message that has a modelId
  const lastUsedModelId = initialMessages
    .filter(m => m.role === "user" && m.modelId)
    .at(-1)
    ?.modelId ?? null;

  return (
    <ChatThread
      params={Promise.resolve({ id })}
      initialMessages={initialMessages}
      initialPendingMessage={initialPendingMessage}
      parentThread={parentThread}
      lastUsedModelId={lastUsedModelId}
      initialThread={
        thread
          ? {
              id: thread.id,
              title: thread.title,
              icon: thread.icon,
              lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
              userId: thread.userId,
              createdAt: thread.createdAt.toISOString(),
              updatedAt: thread.updatedAt.toISOString(),
              isShared: false,
              tags: [],
            }
          : null
      }
    />
  );
}

export async function generateMetadata({ params }: ChatServerProps): Promise<Metadata> {
  const { id } = await params;

  const thread = await getThreadById(id);

  return {
    title: thread ? `${thread.title} - BobrChat` : "Chat",
  };
}
