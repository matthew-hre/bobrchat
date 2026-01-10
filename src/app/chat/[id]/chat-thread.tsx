"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { use, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatView } from "~/components/chat/chat-view";
import { getModelCapabilities, useModels } from "~/features/models";
import { THREADS_KEY } from "~/lib/queries/use-threads";
import { useChatUIStore } from "~/lib/stores/chat-ui-store";

type ChatThreadProps = {
  params: Promise<{ id: string }>;
  initialMessages: ChatUIMessage[];
};

function ChatThread({ params, initialMessages }: ChatThreadProps): React.ReactNode {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const {
    input,
    setInput,
    clearInput,
    searchEnabled,
    setSearchEnabled,
    loadApiKeysFromStorage,
    consumePendingMessage,
    setStreamingThreadId,
    markAssistantMessageStopped,
  } = useChatUIStore();

  const { data: models } = useModels();

  // Keep models in a ref so we can access them in the transport callback
  // without triggering valid re-renders if we were to recreate the transport
  const modelsRef = useRef(models);
  useEffect(() => {
    modelsRef.current = models;
  }, [models]);

  // Load API keys from localStorage on mount
  useEffect(() => {
    loadApiKeysFromStorage();
  }, [loadApiKeysFromStorage]);

  const { messages, sendMessage, status, stop } = useChat<ChatUIMessage>({
    id,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: allMessages }) => {
        // Access Zustand state directly - always current, no refs needed
        const state = useChatUIStore.getState();

        // Determine file support
        const selectedModelInfo = modelsRef.current?.find(m => m.id === state.selectedModelId);
        const capabilities = getModelCapabilities(selectedModelInfo);

        const body = {
          messages: allMessages,
          threadId: id,
          searchEnabled: state.searchEnabled,
          ...(state.openrouterKey && { openrouterClientKey: state.openrouterKey }),
          ...(state.parallelKey && { parallelClientKey: state.parallelKey }),
          ...(state.selectedModelId && { modelId: state.selectedModelId }),
          modelSupportsFiles: capabilities.supportsFiles,
        };
        return { body };
      },
    }),
    messages: initialMessages,
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    },
    onFinish: () => {
      // Refresh the threads list to reflect any automatic renaming
      // We invalidate on every message finish to be safe, but it's most critical for the first one
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });

  useEffect(() => {
    const isStreaming = status === "submitted" || status === "streaming";
    setStreamingThreadId(isStreaming ? id : null);

    return () => {
      // Avoid leaving a stale indicator around if the user navigates away mid-stream.
      if (useChatUIStore.getState().streamingThreadId === id) {
        setStreamingThreadId(null);
      }
    };
  }, [id, setStreamingThreadId, status]);

  // Handle pending message from homepage
  useEffect(() => {
    const pending = consumePendingMessage();
    if (pending) {
      sendMessage(pending);
      clearInput();
    }
  }, [consumePendingMessage, sendMessage, clearInput]);

  const handleStop = useCallback(() => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistantMessage) {
      const state = useChatUIStore.getState();
      markAssistantMessageStopped(lastAssistantMessage.id, state.selectedModelId);

      // Persist the partial assistant message so the stopped state survives refresh.
      // Fire-and-forget; UI state is handled locally.
      fetch("/api/chat/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: id,
          message: {
            ...lastAssistantMessage,
            stoppedByUser: true,
            stoppedModelId: state.selectedModelId,
          },
        }),
      }).catch(() => {});
    }
    stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markAssistantMessageStopped, messages, stop]);

  return (
    <ChatView
      messages={messages}
      input={input}
      setInput={setInput}
      sendMessage={sendMessage}
      isLoading={status === "submitted" || status === "streaming"}
      onStop={handleStop}
      searchEnabled={searchEnabled}
      onSearchChange={setSearchEnabled}
    />
  );
}

export default ChatThread;
