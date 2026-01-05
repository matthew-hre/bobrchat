import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/lib/auth";
import { getMessagesByThreadId, getThreadById } from "~/server/db/queries/chat";
import { hasApiKey } from "~/server/db/queries/settings";

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

  // Verify thread exists and user owns it
  const thread = await getThreadById(id);
  if (!thread || thread.userId !== session.user.id) {
    redirect("/");
  }

  const initialMessages = await getMessagesByThreadId(id);
  const hasServerApiKey = await hasApiKey(session.user.id, "openrouter");

  return <ChatThread params={Promise.resolve({ id })} initialMessages={initialMessages} hasApiKey={hasServerApiKey} />;
}
