"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatView } from "~/components/chat/chat-view";
import { createUserMessage } from "~/lib/utils/messages";
import { createNewThread, saveUserMessage } from "~/server/actions/chat";

export default function HomePage(): React.ReactNode {
  const router = useRouter();
  const [input, setInput] = useState<string>("");
  const threadIdRef = useRef<string | null>(null);

  const { messages, sendMessage } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: allMessages }) => ({
        body: {
          messages: allMessages,
          threadId: threadIdRef.current,
        },
      }),
    }),
  });

  const handleSendMessage = async (messageParts: any) => {
    const userMessage = createUserMessage(messageParts);

    try {
      const threadId = await createNewThread();
      threadIdRef.current = threadId;

      // Save the user message
      await saveUserMessage(threadId, userMessage);

      // Send the message and wait for it to complete
      await sendMessage(messageParts);

      // Navigate to the thread after message is sent
      router.push(`/chat/${threadId}`);
    }
    catch (error) {
      console.error("Failed to create thread:", error);
    }
  };

  return (
    <ChatView
      messages={messages}
      input={input}
      setInput={setInput}
      sendMessage={handleSendMessage}
    />
  );
}
