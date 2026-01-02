"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { use, useState } from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatView } from "~/components/chat/chat-view";
import { createUserMessage } from "~/lib/utils/messages";
import { saveUserMessage } from "~/server/actions/chat";

type ChatThreadProps = {
  params: Promise<{ id: string }>;
  initialMessages: ChatUIMessage[];
};

function ChatThread({ params, initialMessages }: ChatThreadProps): React.ReactNode {
  const [input, setInput] = useState<string>("");
  const { id } = use(params);

  const { messages, sendMessage } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: allMessages }) => ({
        body: {
          messages: allMessages,
          threadId: id,
        },
      }),
    }),
    messages: initialMessages,
  });

  const handleSendMessage = async (messageParts: any) => {
    const userMessage = createUserMessage(messageParts);

    // Save the user message first
    await saveUserMessage(id, userMessage);
    // Then send it
    sendMessage(messageParts);
  };

  return (
    <ChatView messages={messages} input={input} setInput={setInput} sendMessage={handleSendMessage} />
  );
}

export default ChatThread;
