"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { use, useEffect } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatView } from "~/components/chat/chat-view";
import { useChatUIStore } from "~/lib/stores/chat-ui-store";

type ChatThreadProps = {
  params: Promise<{ id: string }>;
  initialMessages: ChatUIMessage[];
  hasApiKey: boolean;
};

function ChatThread({ params, initialMessages, hasApiKey }: ChatThreadProps): React.ReactNode {
  const { id } = use(params);
  const {
    input,
    setInput,
    clearInput,
    searchEnabled,
    setSearchEnabled,
    loadApiKeysFromStorage,
    consumePendingMessage,
  } = useChatUIStore();

  // Load API keys from localStorage on mount
  useEffect(() => {
    loadApiKeysFromStorage();
  }, [loadApiKeysFromStorage]);

  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    id,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: allMessages }) => {
        // Access Zustand state directly - always current, no refs needed
        const state = useChatUIStore.getState();
        const body = {
          messages: allMessages,
          threadId: id,
          searchEnabled: state.searchEnabled,
          ...(state.browserApiKey && { browserApiKey: state.browserApiKey }),
          ...(state.parallelApiKey && { parallelBrowserApiKey: state.parallelApiKey }),
          ...(state.selectedModelId && { modelId: state.selectedModelId }),
        };
        return { body };
      },
    }),
    messages: initialMessages,
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  // Handle pending message from homepage
  useEffect(() => {
    const pending = consumePendingMessage();
    if (pending) {
      sendMessage(pending);
      clearInput();
    }
  }, [consumePendingMessage, sendMessage, clearInput]);

  return (
    <ChatView
      messages={messages}
      input={input}
      setInput={setInput}
      sendMessage={sendMessage}
      isLoading={status === "submitted" || status === "streaming"}
      searchEnabled={searchEnabled}
      onSearchChange={setSearchEnabled}
      hasApiKey={hasApiKey}
    />
  );
}

export default ChatThread;
