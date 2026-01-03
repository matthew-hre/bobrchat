"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatView } from "~/components/chat/chat-view";
import { useUserSettings } from "~/hooks/use-user-settings";
import { createUserMessage } from "~/lib/utils/messages";
import { createNewThread, saveUserMessage } from "~/server/actions/chat";

export default function HomePage(): React.ReactNode {
  const router = useRouter();
  const { settings } = useUserSettings();
  const [input, setInput] = useState<string>("");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const threadIdRef = useRef<string | null>(null);

  // Restore search preference from localStorage on mount
  useEffect(() => {
    const savedSearchEnabled = localStorage.getItem("search_enabled");
    if (savedSearchEnabled !== null) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setSearchEnabled(JSON.parse(savedSearchEnabled));
    }
  }, []);

  // Log search state changes
  const handleSearchChange = (enabled: boolean) => {
    setSearchEnabled(enabled);
    localStorage.setItem("search_enabled", JSON.stringify(enabled));
  };

  // Use a ref to always have the latest searchEnabled value
  const searchEnabledRef = useRef(searchEnabled);
  useEffect(() => {
    searchEnabledRef.current = searchEnabled;
  }, [searchEnabled]);

  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: allMessages }) => {
        const body = {
          messages: allMessages,
          threadId: threadIdRef.current,
          searchEnabled: searchEnabledRef.current,
        };
        return { body };
      },
    }),
  });

  const handleSendMessage = async (messageParts: any) => {
    const userMessage = createUserMessage(messageParts);

    try {
      const threadId = await createNewThread(settings?.defaultThreadName);
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
      isLoading={status === "submitted" || status === "streaming"}
      searchEnabled={searchEnabled}
      onSearchChange={handleSearchChange}
    />
  );
}
