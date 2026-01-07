"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatView } from "~/components/chat/chat-view";
import { useModelContext } from "~/components/chat/model-context";
import { useChatInputFeatures } from "~/hooks/use-chat-input-features";

type ChatThreadProps = {
  params: Promise<{ id: string }>;
  initialMessages: ChatUIMessage[];
  hasApiKey: boolean;
};

function ChatThread({ params, initialMessages, hasApiKey }: ChatThreadProps): React.ReactNode {
  const [input, setInput] = useState<string>("");
  const [browserApiKey, setBrowserApiKey] = useState<string | null>(null);
  const { id } = use(params);
  const { selectedModelId } = useModelContext();

  const { features, getLatestValues } = useChatInputFeatures(
    { key: "search", defaultValue: false, persist: true },
  );

  useEffect(() => {
    const key = localStorage.getItem("openrouter_api_key");
    if (key) {
      setBrowserApiKey(key);
    }
  }, []);

  // Keep ref for browserApiKey for closure
  const browserApiKeyRef = useRef(browserApiKey);
  useEffect(() => {
    browserApiKeyRef.current = browserApiKey;
  }, [browserApiKey]);

  // Keep ref for selectedModelId for closure
  const selectedModelIdRef = useRef(selectedModelId);
  useEffect(() => {
    selectedModelIdRef.current = selectedModelId;
  }, [selectedModelId]);

  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: allMessages }) => {
        const latestValues = getLatestValues();
        const body = {
          messages: allMessages,
          threadId: id,
          searchEnabled: latestValues.search,
          ...(browserApiKeyRef.current && { browserApiKey: browserApiKeyRef.current }),
          ...(selectedModelIdRef.current && { modelId: selectedModelIdRef.current }),
        };
        return { body };
      },
    }),
    messages: initialMessages,
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  return (
    <ChatView
      messages={messages}
      input={input}
      setInput={setInput}
      sendMessage={sendMessage}
      isLoading={status === "submitted" || status === "streaming"}
      searchEnabled={features.search.value}
      onSearchChange={(enabled) => {
        features.search.setValue(enabled);
      }}
      hasApiKey={hasApiKey}
    />
  );
}

export default ChatThread;
