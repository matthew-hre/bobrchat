"use client";

import { memo, useMemo, useState } from "react";

import type { ChatUIMessage } from "~/features/chat/types";

import { useFilteredMessages } from "~/features/chat/hooks/use-filtered-messages";
import { useChatUIStore } from "~/features/chat/store";

import type { EditedMessagePayload } from "./messages/inline-message-editor";

import { AssistantMessage } from "./messages/assistant-message";
import { EditableUserMessage } from "./messages/editable-user-message";
import { LoadingSpinner } from "./ui/loading-spinner";

type ChatRow
  = | { kind: "user"; key: string; message: ChatUIMessage; previousModelId: string | null }
    | { kind: "assistant"; key: string; message: ChatUIMessage; isLastMessage: boolean; creditError: { messageId: string } | null }
    | { kind: "loading"; key: string };

export const ChatMessages = memo(({
  messages,
  isLoading,
  onRegenerate,
  isRegenerating,
  onEditMessage,
  isEditSubmitting,
  creditError,
  onRetryCreditError,
  onDismissCreditError,
}: {
  messages: ChatUIMessage[];
  isLoading?: boolean;
  onRegenerate?: (messageId: string) => void;
  isRegenerating?: boolean;
  onEditMessage?: (messageId: string, payload: EditedMessagePayload) => Promise<void>;
  isEditSubmitting?: boolean;
  creditError?: { messageId: string } | null;
  onRetryCreditError?: () => void;
  onDismissCreditError?: () => void;
}) => {
  const stoppedAssistantMessageInfoById = useChatUIStore(state => state.stoppedAssistantMessageInfoById);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const canEditMessages = !isLoading && !isRegenerating && !isEditSubmitting;

  const filteredMessages = useFilteredMessages(messages);

  const rows: ChatRow[] = useMemo(() => {
    const result: ChatRow[] = filteredMessages.map((message, idx) => {
      if (message.role === "user") {
        const nextMessage = filteredMessages[idx + 1];
        const previousModelId = message.modelId
          || (nextMessage?.role === "assistant"
            ? (nextMessage.metadata?.model || nextMessage.stoppedModelId || stoppedAssistantMessageInfoById[nextMessage.id]?.modelId || null)
            : null);
        return { kind: "user", key: message.id, message, previousModelId };
      }

      const isLastMessage = idx === filteredMessages.length - 1;
      return {
        kind: "assistant",
        key: message.id,
        message,
        isLastMessage,
        creditError: isLastMessage ? creditError ?? null : null,
      };
    });

    if (isLoading) {
      result.push({ kind: "loading", key: "loading" });
    }

    return result;
  }, [filteredMessages, stoppedAssistantMessageInfoById, creditError, isLoading]);

  const handleStartEdit = (messageId: string) => {
    if (canEditMessages) {
      setEditingMessageId(messageId);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
  };

  const handleSubmitEdit = async (messageId: string, payload: EditedMessagePayload) => {
    if (onEditMessage) {
      await onEditMessage(messageId, payload);
      setEditingMessageId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-4 py-8">
      {rows.map((row) => {
        if (row.kind === "user") {
          return (
            <div
              key={row.key}
              data-message-id={row.message.id}
              className="mb-4"
            >
              <EditableUserMessage
                message={row.message}
                previousModelId={row.previousModelId}
                isEditing={editingMessageId === row.message.id}
                onStartEdit={() => handleStartEdit(row.message.id)}
                onCancelEdit={handleCancelEdit}
                onSubmitEdit={payload => handleSubmitEdit(row.message.id, payload)}
                canEdit={canEditMessages && !!onEditMessage}
                isSubmitting={isEditSubmitting}
              />
            </div>
          );
        }

        if (row.kind === "assistant") {
          return (
            <div
              key={row.key}
              data-message-id={row.message.id}
              className="mb-4"
            >
              <AssistantMessage
                message={row.message}
                isLastMessage={row.isLastMessage}
                isLoading={isLoading ?? false}
                onRegenerate={onRegenerate}
                isRegenerating={isRegenerating}
                creditError={row.creditError}
                onRetryCreditError={onRetryCreditError}
                onDismissCreditError={onDismissCreditError}
              />
            </div>
          );
        }

        if (row.kind === "loading") {
          return <div key={row.key} className="mb-4"><LoadingSpinner /></div>;
        }

        return null;
      })}
    </div>
  );
});
