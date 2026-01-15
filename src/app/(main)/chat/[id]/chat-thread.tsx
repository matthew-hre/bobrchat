"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { use, useCallback, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/app/api/chat/route";
import type { EditedMessagePayload } from "~/features/chat/components/messages/inline-message-editor";

import { deleteMessageAttachmentsByIds, truncateThreadMessages } from "~/features/chat/actions";
import { ChatMessages } from "~/features/chat/components/chat-messages";
import { ChatView } from "~/features/chat/components/chat-view";
import { THREADS_KEY } from "~/features/chat/hooks/use-threads";
import { parseAIError } from "~/features/chat/lib/parse-ai-error";
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
    clearInput,
    setSearchEnabled,
    setReasoningLevel,
    setSelectedModelId,
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
  const [isEditSubmitting, startEditTransition] = useTransition();

  const { messages, sendMessage: baseSendMessage, status, stop, regenerate, setMessages } = useChat<ChatUIMessage>({
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

  // Wrapper around sendMessage that patches the user message with toggle values
  // so editing works correctly before page refresh
  const sendMessage: typeof baseSendMessage = useCallback(async (message, options) => {
    const state = useChatUIStore.getState();
    const promise = baseSendMessage(message, options);

    // Patch the newly added user message with toggle values
    // Use setTimeout to ensure React has flushed the state update from baseSendMessage
    setTimeout(() => {
      setMessages((prev) => {
        // Find the last user message (not just last message, since streaming may have started)
        const lastUserIdx = prev.findLastIndex(m => m.role === "user");
        if (lastUserIdx === -1)
          return prev;

        const msg = prev[lastUserIdx];
        if ("searchEnabled" in msg)
          return prev; // Already patched

        return prev.map((m, idx) => {
          if (idx === lastUserIdx) {
            return {
              ...m,
              searchEnabled: state.searchEnabled,
              reasoningLevel: state.reasoningLevel,
            };
          }
          return m;
        });
      });
    }, 0);

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

  const handleEditMessage = useCallback(async (messageId: string, payload: EditedMessagePayload) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1)
      return;

    if (messages[messageIndex].role !== "user")
      return;

    startEditTransition(async () => {
      try {
        // Delete this message and all subsequent messages from the database
        await truncateThreadMessages(id, messageIndex);

        // Delete removed attachments
        if (payload.removedAttachmentIds.length > 0) {
          await deleteMessageAttachmentsByIds(payload.removedAttachmentIds);
        }

        // Update local client state to match truncation
        setMessages(prev => prev.slice(0, messageIndex));

        // Build file parts for the new message
        const files = [
          ...payload.keptAttachments.map(attachment => ({
            type: "file" as const,
            id: attachment.id,
            url: attachment.url,
            filename: attachment.filename ?? "file",
            mediaType: attachment.mediaType ?? "application/octet-stream",
            storagePath: attachment.storagePath,
          })),
          ...payload.newFiles.map(file => ({
            type: "file" as const,
            id: file.id,
            url: file.url,
            filename: file.filename ?? "file",
            mediaType: file.mediaType ?? "application/octet-stream",
            storagePath: file.storagePath,
          })),
        ];

        // Update global UI store to match the edited message's toggles
        setSearchEnabled(payload.searchEnabled);
        setReasoningLevel(payload.reasoningLevel);
        if (payload.modelId) {
          setSelectedModelId(payload.modelId);
        }

        // Send the edited message (toggle values are patched by sendMessage wrapper)
        sendMessage({
          text: payload.content,
          files: files.length > 0 ? files : undefined,
        });
      }
      catch (error) {
        console.error("Failed to edit message:", error);
        toast.error("Failed to edit message");
      }
    });
  }, [id, messages, sendMessage, setMessages, setSearchEnabled, setReasoningLevel, setSelectedModelId]);

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <ChatView
      messages={messages}
      sendMessage={sendMessage}
      isLoading={isLoading}
      onStop={handleStop}
      threadId={id}
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
