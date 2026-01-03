"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { use, useEffect, useRef, useState } from "react";

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
  const [browserApiKey, setBrowserApiKey] = useState<string | null>(null);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const { id } = use(params);

  useEffect(() => {
    const key = localStorage.getItem("openrouter_api_key");
    if (key) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setBrowserApiKey(key);
    }

    // Restore search preference from localStorage
    const savedSearchEnabled = localStorage.getItem("search_enabled");
    if (savedSearchEnabled !== null) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setSearchEnabled(JSON.parse(savedSearchEnabled));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("search_enabled", JSON.stringify(searchEnabled));
  }, [searchEnabled]);

  // Use refs to always have the latest values
  const searchEnabledRef = useRef(searchEnabled);
  const browserApiKeyRef = useRef(browserApiKey);
  useEffect(() => {
    searchEnabledRef.current = searchEnabled;
  }, [searchEnabled]);
  useEffect(() => {
    browserApiKeyRef.current = browserApiKey;
  }, [browserApiKey]);

  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: allMessages }) => {
        const body = {
          messages: allMessages,
          threadId: id,
          searchEnabled: searchEnabledRef.current,
          ...(browserApiKeyRef.current && { browserApiKey: browserApiKeyRef.current }),
        };
        return { body };
      },
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
    <ChatView
      messages={messages}
      input={input}
      setInput={setInput}
      sendMessage={handleSendMessage}
      isLoading={status === "submitted" || status === "streaming"}
      searchEnabled={searchEnabled}
      onSearchChange={(enabled) => {
        setSearchEnabled(enabled);
      }}
    />
  );
}

export default ChatThread;
