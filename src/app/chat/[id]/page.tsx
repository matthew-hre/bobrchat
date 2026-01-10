import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/features/auth/lib/auth";
import { getMessagesByThreadId, getThreadById } from "~/server/db/queries/chat";

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

  // Verify thread exists and user owns it
  if (!thread || thread.userId !== session.user.id) {
    redirect("/");
  }

  return <ChatThread params={Promise.resolve({ id })} initialMessages={initialMessages} />;
}
