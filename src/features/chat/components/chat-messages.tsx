"use client";

import { memo, useState } from "react";

import type { ChatUIMessage } from "~/features/chat/types";

import { useFilteredMessages } from "~/features/chat/hooks/use-filtered-messages";
import { useChatUIStore } from "~/features/chat/store";

import type { EditedMessagePayload } from "./messages/inline-message-editor";

import { AssistantMessage } from "./messages/assistant-message";
import { EditableUserMessage } from "./messages/editable-user-message";
import { LoadingSpinner } from "./ui/loading-spinner";

export const ChatMessages = memo(({
  messages,
  isLoading,
  onRegenerate,
  isRegenerating,
  onEditMessage,
  isEditSubmitting,
}: {
  messages: ChatUIMessage[];
  isLoading?: boolean;
  onRegenerate?: (messageId: string) => void;
  isRegenerating?: boolean;
  onEditMessage?: (messageId: string, payload: EditedMessagePayload) => Promise<void>;
  isEditSubmitting?: boolean;
}) => {
  const searchEnabled = useChatUIStore(state => state.searchEnabled);
  const stoppedAssistantMessageInfoById = useChatUIStore(state => state.stoppedAssistantMessageInfoById);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const canEditMessages = !isLoading && !isRegenerating && !isEditSubmitting;

  const filteredMessages = useFilteredMessages(messages);

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
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 py-8">
      {filteredMessages.map((message, messageIndex) => {
        if (message.role === "user") {
          const nextMessage = filteredMessages[messageIndex + 1];
          const previousModelId = message.modelId
            || (nextMessage?.role === "assistant"
              ? (nextMessage.metadata?.model || nextMessage.stoppedModelId || stoppedAssistantMessageInfoById[nextMessage.id]?.modelId || null)
              : null);

          return (
            <div key={message.id} data-message-id={message.id}>
              <EditableUserMessage
                message={message}
                previousModelId={previousModelId}
                isEditing={editingMessageId === message.id}
                onStartEdit={() => handleStartEdit(message.id)}
                onCancelEdit={handleCancelEdit}
                onSubmitEdit={payload => handleSubmitEdit(message.id, payload)}
                canEdit={canEditMessages && !!onEditMessage}
                isSubmitting={isEditSubmitting}
              />
            </div>
          );
        }

        return (
          <div key={message.id} data-message-id={message.id}>
            <AssistantMessage
              message={message}
              isLastMessage={messageIndex === filteredMessages.length - 1}
              isLoading={isLoading ?? false}
              searchEnabled={searchEnabled}
              onRegenerate={onRegenerate}
              isRegenerating={isRegenerating}
            />
          </div>
        );
      })}
      {isLoading && <LoadingSpinner />}
    </div>
  );
});
