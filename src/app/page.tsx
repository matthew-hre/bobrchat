"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatView } from "~/components/chat/chat-view";

export default function ChatThread(): React.ReactNode {
  const [input, setInput] = useState<string>("");

  const { messages, sendMessage } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <ChatView messages={messages} input={input} setInput={setInput} sendMessage={sendMessage} />
  );
}
