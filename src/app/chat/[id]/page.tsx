import { getMessagesByThreadId } from "~/server/db/queries/chat";

import ChatThread from "./chat-thread";

type ChatServerProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatServer({ params }: ChatServerProps) {
  const { id } = await params;
  const initialMessages = await getMessagesByThreadId(id);

  return <ChatThread params={Promise.resolve({ id })} initialMessages={initialMessages} />;
}
