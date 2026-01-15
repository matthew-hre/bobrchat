import type { UIMessage } from "ai";
import type { Metadata } from "next";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "~/features/auth/lib/auth";
import { getMessagesByThreadId, getThreadById } from "~/features/chat/queries";

import ChatThread from "./chat-thread";

type ChatServerProps = {
  params: Promise<{ id: string }>;
};

const getThreadCached = cache(async (id: string) => {
  return getThreadById(id);
});

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
    getThreadCached(id),
    getMessagesByThreadId(id),
  ]);

  // Verify thread exists and user owns it
  if (!thread || thread.userId !== session.user.id) {
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

  const thread = await getThreadCached(id);

  return {
    title: thread ? `${thread.title} - BobrChat` : "Chat",
  };
}
