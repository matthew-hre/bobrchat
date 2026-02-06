"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/features/chat/types";

import { ChatMessages } from "~/features/chat/components/chat-messages";
import { ChatView } from "~/features/chat/components/chat-view";
import { useChatActions } from "~/features/chat/hooks/use-chat-actions";
import { THREADS_KEY, useThreadTitle } from "~/features/chat/hooks/use-threads";
import { parseAIError } from "~/features/chat/lib/parse-ai-error";
import { useChatUIStore } from "~/features/chat/store";
import { getModelCapabilities, useFavoriteModels } from "~/features/models";

type ChatThreadProps = {
  params: Promise<{ id: string }>;
  initialMessages: ChatUIMessage[];
  initialPendingMessage?: any | null;
  parentThread?: { id: string; title: string } | null;
};

function ChatThread({ params, initialMessages, initialPendingMessage, parentThread }: ChatThreadProps): React.ReactNode {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const {
    clearInput,
    setInput,
    setStreamingThreadId,
  } = useChatUIStore();

  // Handle handoff prompt from sessionStorage
  const hasSetHandoffPromptRef = useRef(false);
  useEffect(() => {
    if (hasSetHandoffPromptRef.current) {
      return;
    }

    const handoffPrompt = sessionStorage.getItem(`handoff_${id}`);
    if (handoffPrompt) {
      hasSetHandoffPromptRef.current = true;
      setInput(handoffPrompt);
      sessionStorage.removeItem(`handoff_${id}`);
    }
  }, [id, setInput]);

  const { models: favoriteModels } = useFavoriteModels();

  // Keep models in a ref so we can access them in the transport callback
  // without triggering re-renders if we were to recreate the transport
  const modelsRef = useRef(favoriteModels);
  useEffect(() => {
    modelsRef.current = favoriteModels;
  }, [favoriteModels]);

  // Memoize transport to avoid recreating on every render
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ messages: allMessages, body: requestBody, trigger }) => {
      // Access Zustand state directly - always current, no refs needed
      const state = useChatUIStore.getState();

      // Determine PDF support for native PDF handling
      const selectedModelInfo = modelsRef.current?.find(m => m.id === state.selectedModelId);
      const capabilities = getModelCapabilities(selectedModelInfo);

      const body = {
        messages: allMessages,
        threadId: id,
        searchEnabled: state.searchEnabled && capabilities.supportsSearch,
        reasoningLevel: capabilities.supportsReasoning ? state.reasoningLevel : undefined,
        ...(state.openrouterKey && { openrouterClientKey: state.openrouterKey }),
        ...(state.parallelKey && { parallelClientKey: state.parallelKey }),
        ...(state.selectedModelId && { modelId: state.selectedModelId }),
        supportsNativePdf: capabilities.supportsNativePdf,
        supportsTools: capabilities.supportsTools,
        // Pass pricing from client cache to avoid server-side model fetch
        ...(selectedModelInfo?.pricing && {
          modelPricing: {
            prompt: selectedModelInfo.pricing.prompt,
            completion: selectedModelInfo.pricing.completion,
          },
        }),
        // Mark as regeneration if triggered by regenerate function
        isRegeneration: trigger === "regenerate-message",
        // Merge any additional body properties from the request
        ...requestBody,
      };
      return { body };
    },
  }), [id]);

  const { messages, sendMessage: baseSendMessage, status, stop, regenerate, setMessages } = useChat<ChatUIMessage>({
    id,
    transport,
    messages: initialMessages,
    experimental_throttle: 75,
    onError: (error) => {
      const friendlyMessage = parseAIError(error);
      toast.error(friendlyMessage);
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

  const threadTitle = useThreadTitle(id);
  useEffect(() => {
    if (threadTitle) {
      document.title = `${threadTitle} - BobrChat`;
    }
  }, [threadTitle]);

  // Wrapper around sendMessage that patches toggle values onto the user message
  // so the edit UI can read them before page refresh (DB has these values after reload)
  const sendMessage: typeof baseSendMessage = useCallback(async (message, options) => {
    const state = useChatUIStore.getState();
    const { searchEnabled, reasoningLevel } = state;

    const promise = baseSendMessage(message, options);

    // The AI SDK adds the message to state synchronously, but doesn't preserve
    // extra fields. Patch the message after React's batch update completes.
    queueMicrotask(() => {
      setMessages((prev) => {
        const lastUserIdx = prev.findLastIndex(m => m.role === "user");
        if (lastUserIdx === -1)
          return prev;

        const msg = prev[lastUserIdx];
        if ("searchEnabled" in msg)
          return prev;

        return prev.map((m, idx) =>
          idx === lastUserIdx
            ? { ...m, searchEnabled, reasoningLevel }
            : m,
        );
      });
    });

    return promise;
  }, [baseSendMessage, setMessages]);

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

  const {
    handleStop,
    handleRegenerate,
    handleEditMessage,
    isRegenerating,
    isEditSubmitting,
  } = useChatActions({
    threadId: id,
    messages,
    setMessages,
    regenerate,
    stop,
    sendMessage,
  });

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <ChatView
      messages={messages}
      sendMessage={sendMessage}
      isLoading={isLoading}
      onStop={handleStop}
      threadId={id}
      parentThread={parentThread}
    >
      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
        onEditMessage={handleEditMessage}
        isEditSubmitting={isEditSubmitting}
      />
    </ChatView>
  );
}

export default ChatThread;
