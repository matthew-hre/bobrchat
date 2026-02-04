"use client";

import type { UseChatHelpers } from "@ai-sdk/react";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";

import type { EditedMessagePayload } from "~/features/chat/components/messages/inline-message-editor";
import type { ChatUIMessage } from "~/features/chat/types";

import { deleteMessageAttachmentsByIds, truncateThreadMessages } from "~/features/chat/actions";
import { useChatUIStore } from "~/features/chat/store";

type UseChatActionsProps = {
  threadId: string;
  messages: ChatUIMessage[];
  setMessages: UseChatHelpers<ChatUIMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatUIMessage>["regenerate"];
  stop: UseChatHelpers<ChatUIMessage>["stop"];
  sendMessage: UseChatHelpers<ChatUIMessage>["sendMessage"];
};

export function useChatActions({
  threadId,
  messages,
  setMessages,
  regenerate,
  stop,
  sendMessage,
}: UseChatActionsProps) {
  const {
    markAssistantMessageStopped,
    setSearchEnabled,
    setReasoningLevel,
    setSelectedModelId,
  } = useChatUIStore();

  const [isRegenerating, startRegenerateTransition] = useTransition();
  const [isEditSubmitting, startEditTransition] = useTransition();

  const handleStop = useCallback(() => {
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
    let currentAssistantMessage: ChatUIMessage | null = null;
    for (let i = lastUserMessageIndex + 1; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "assistant" && !state.stoppedAssistantMessageInfoById[msg.id]) {
        currentAssistantMessage = msg;
        break;
      }
    }

    if (currentAssistantMessage) {
      markAssistantMessageStopped(currentAssistantMessage.id, state.selectedModelId);

      // Persist the partial assistant message so the stopped state survives refresh.
      // Fire-and-forget; UI state is handled locally.
      fetch("/api/chat/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          message: {
            ...currentAssistantMessage,
            stoppedByUser: true,
            stoppedModelId: state.selectedModelId,
          },
        }),
      }).catch(() => {});
    }

    stop();
  }, [markAssistantMessageStopped, messages, stop, threadId]);

  const handleRegenerate = useCallback((messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1)
      return;

    startRegenerateTransition(async () => {
      try {
        // Delete the assistant message (and any after it) from the database
        // We keep messages up to (but not including) the assistant message
        await truncateThreadMessages(threadId, messageIndex);

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
  }, [messages, regenerate, threadId]);

  const handleEditMessage = useCallback(async (messageId: string, payload: EditedMessagePayload) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1)
      return;

    if (messages[messageIndex].role !== "user")
      return;

    startEditTransition(async () => {
      try {
        // Delete this message and all subsequent messages from the database
        await truncateThreadMessages(threadId, messageIndex);

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
  }, [messages, sendMessage, setMessages, setReasoningLevel, setSearchEnabled, setSelectedModelId, threadId]);

  return {
    handleStop,
    handleRegenerate,
    handleEditMessage,
    isRegenerating,
    isEditSubmitting,
  };
}
