"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { use, useCallback, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { truncateThreadMessages } from "~/features/chat/actions";
import { ChatView } from "~/features/chat/components/chat-view";
import { THREADS_KEY } from "~/features/chat/hooks/use-threads";
import { useChatUIStore } from "~/features/chat/store";
import { getModelCapabilities, useModels } from "~/features/models";

type ChatThreadProps = {
  params: Promise<{ id: string }>;
  initialMessages: ChatUIMessage[];
  initialPendingMessage?: any | null;
};

function ChatThread({ params, initialMessages, initialPendingMessage }: ChatThreadProps): React.ReactNode {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const {
    input,
    setInput,
    clearInput,
    searchEnabled,
    setSearchEnabled,
    reasoningLevel,
    setReasoningLevel,
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

  const [isRegenerating, startRegenerateTransition] = useTransition();

  const { messages, sendMessage, status, stop, regenerate } = useChat<ChatUIMessage>({
    id,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: allMessages, body: requestBody, trigger }) => {
        // Access Zustand state directly - always current, no refs needed
        const state = useChatUIStore.getState();

        // Determine file support
        const selectedModelInfo = modelsRef.current?.find(m => m.id === state.selectedModelId);
        const capabilities = getModelCapabilities(selectedModelInfo);

        const body = {
          messages: allMessages,
          threadId: id,
          searchEnabled: state.searchEnabled,
          reasoningLevel: state.reasoningLevel,
          ...(state.openrouterKey && { openrouterClientKey: state.openrouterKey }),
          ...(state.parallelKey && { parallelClientKey: state.parallelKey }),
          ...(state.selectedModelId && { modelId: state.selectedModelId }),
          modelSupportsFiles: capabilities.supportsFiles,
          supportsNativePdf: capabilities.supportsNativePdf,
          // Mark as regeneration if triggered by regenerate function
          isRegeneration: trigger === "regenerate-message",
          // Merge any additional body properties from the request
          ...requestBody,
        };
        return { body };
      },
    }),
    messages: initialMessages,
    onError: (error) => {
      toast.error((`API Error: ${error.message}`) || "Failed to send message");
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

  // Handle initial pending message (from sessionStorage when creating new thread)
  const hasSentInitialRef = useRef(false);

  useEffect(() => {
    if (hasSentInitialRef.current)
      return;

    // First check if we have it from sessionStorage (new thread flow)
    let messageToSend = initialPendingMessage;
    if (!messageToSend) {
      const stored = sessionStorage.getItem(`initial_${id}`);
      if (stored) {
        try {
          messageToSend = JSON.parse(stored);
        }
        catch (e) {
          console.error(`[chat-thread] Failed to parse stored initial message:`, e);
        }
      }
    }

    if (!messageToSend)
      return;

    hasSentInitialRef.current = true;
    sendMessage(messageToSend);
    clearInput();

    // Clean up sessionStorage
    sessionStorage.removeItem(`initial_${id}`);
  }, [id, initialPendingMessage, sendMessage, clearInput]);

  const handleStop = useCallback(() => {
    // Find the assistant message that's currently being generated
    // This is the first un-stopped assistant message after the most recent user message
    const state = useChatUIStore.getState();
    
    // Find the most recent user message
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessageIndex = i;
        break;
      }
    }
    
    // Find the first un-stopped assistant message after the last user message
    let currentAssistantMessage = null;
    for (let i = lastUserMessageIndex + 1; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "assistant" && !state.stoppedAssistantMessageInfoById[msg.id]) {
        currentAssistantMessage = msg;
        break;
      }
    }

    if (currentAssistantMessage) {
      const state = useChatUIStore.getState();
      markAssistantMessageStopped(currentAssistantMessage.id, state.selectedModelId);

      // Persist the partial assistant message so the stopped state survives refresh.
      // Fire-and-forget; UI state is handled locally.
      fetch("/api/chat/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: id,
          message: {
            ...currentAssistantMessage,
            stoppedByUser: true,
            stoppedModelId: state.selectedModelId,
          },
        }),
      }).catch(() => { });
    }
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markAssistantMessageStopped, messages, stop]);

  const handleRegenerate = useCallback((messageId: string) => {
    // Find the message index to calculate how many messages to keep in DB
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1)
      return;

    startRegenerateTransition(async () => {
      try {
        // Delete the assistant message (and any after it) from the database
        // We keep messages up to (but not including) the assistant message
        await truncateThreadMessages(id, messageIndex);

        // Use the SDK's built-in regenerate function which:
        // 1. Removes the assistant message from local state
        // 2. Re-triggers the API call with the remaining messages
        // 3. Does NOT add a new user message
        // The trigger will be "regenerate-message" which our transport uses to set isRegeneration
        regenerate({ messageId });
      }
      catch (error) {
        console.error("Failed to regenerate:", error);
        toast.error("Failed to regenerate response");
      }
    });
  }, [id, messages, regenerate]);

  return (
    <ChatView
      messages={messages}
      input={input}
      setInput={setInput}
      sendMessage={sendMessage}
      isLoading={status === "submitted" || status === "streaming"}
      onStop={handleStop}
      searchEnabled={searchEnabled}
      onSearchChangeAction={setSearchEnabled}
      reasoningLevel={reasoningLevel}
      onReasoningChangeAction={setReasoningLevel}
      onRegenerate={handleRegenerate}
      isRegenerating={isRegenerating}
    />
  );
}

export default ChatThread;
