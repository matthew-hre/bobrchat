"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatInput } from "~/components/chat/chat-input";

export default function ChatThread() {
  const [input, setInput] = useState("");

  const { messages, sendMessage } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <div className="flex h-full max-h-screen flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.map(message => (
          <div key={message.id}>
            {message.parts.map((part) => {
              if (part.type === "text") {
                return <div key={`${message.id}-text`}>{part.text}</div>;
              }
              return null;
            })}
            {message.metadata && (
              <pre>
                {JSON.stringify(message.metadata, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
      <ChatInput
        value={input}
        onValueChange={setInput}
        onSendMessage={(content) => {
          sendMessage({
            parts: [{ type: "text", text: content }],
          });
        }}
      />
    </div>
  );
}
