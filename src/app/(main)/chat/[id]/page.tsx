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

  const thread = await getThreadById(id);

  // New thread fast-path: skip pointless DB queries for threads that don't exist yet
  if (!thread) {
    return (
      <ChatThread
        params={Promise.resolve({ id })}
        initialMessages={[]}
        initialPendingMessage={null}
        parentThread={null}
        lastUsedModelId={null}
        initialThread={null}
      />
    );
  }

  // Existing thread: verify ownership
  if (thread.userId !== session.user.id) {
    redirect("/");
  }

  // Fetch messages and parent thread in parallel
  const [initialMessages, parentThread] = await Promise.all([
    getMessagesByThreadId(id),
    getParentThread(id),
  ]);

  // Derive the last-used model from the most recent user message that has a modelId
  const lastUsedModelId = initialMessages
    .filter(m => m.role === "user" && m.modelId)
    .at(-1)
    ?.modelId ?? null;

  return (
    <ChatThread
      params={Promise.resolve({ id })}
      initialMessages={initialMessages}
      initialPendingMessage={null}
      parentThread={parentThread}
      lastUsedModelId={lastUsedModelId}
      initialThread={{
        id: thread.id,
        title: thread.title,
        icon: thread.icon,
        lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
        userId: thread.userId,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        isShared: false,
        tags: [],
      }}
    />
  );
}

export async function generateMetadata({ params }: ChatServerProps): Promise<Metadata> {
  const { id } = await params;

  const thread = await getThreadById(id);

  return {
    title: thread ? `${thread.title} - BobrChat` : "Chat",
    robots: { index: false, follow: false },
  };
}
