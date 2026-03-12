"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatUIMessage } from "~/features/chat/types";

import { useFilteredMessages } from "~/features/chat/hooks/use-filtered-messages";
import { useChatUIStore } from "~/features/chat/store";

import type { ChatScrollContext } from "./chat-view";
import type { EditedMessagePayload } from "./messages/inline-message-editor";

import { AssistantMessage } from "./messages/assistant-message";
import { EditableUserMessage } from "./messages/editable-user-message";
import { LoadingSpinner } from "./ui/loading-spinner";

type ChatRow
  = | { kind: "user"; key: string; message: ChatUIMessage; previousModelId: string | null }
    | { kind: "assistant"; key: string; message: ChatUIMessage; isLastMessage: boolean; creditError: { messageId: string } | null }
    | { kind: "loading"; key: string };

function estimateRowSize(row: ChatRow): number {
  if (row.kind === "loading")
    return 56;
  if (row.kind === "user")
    return 120;
  return 220;
}

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
  scrollContext,
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
  scrollContext: ChatScrollContext;
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

  const { registerScrollToBottom, isUserNearBottomRef, scrollToBottom } = scrollContext;

  // Batch onChange → scrollToBottom into a single rAF per frame to avoid
  // cascading scroll calls from rapid measurement corrections.
  const onChangeRafRef = useRef(0);
  const batchedScrollToBottom = useCallback(() => {
    if (onChangeRafRef.current)
      return;
    onChangeRafRef.current = requestAnimationFrame(() => {
      onChangeRafRef.current = 0;
      if (isUserNearBottomRef.current) {
        scrollToBottom();
      }
    });
  }, [isUserNearBottomRef, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (onChangeRafRef.current) {
        cancelAnimationFrame(onChangeRafRef.current);
      }
    };
  }, []);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContext.viewportElement,
    estimateSize: index => estimateRowSize(rows[index]),
    overscan: 5,
    getItemKey: index => rows[index].key,
    paddingStart: 32,
    paddingEnd: 32,
    onChange: batchedScrollToBottom,
  });

  useEffect(() => {
    registerScrollToBottom(() => {
      scrollToBottom();
    });
  }, [registerScrollToBottom, scrollToBottom]);

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

  const measureElement = useCallback((node: HTMLElement | null) => {
    if (node) {
      virtualizer.measureElement(node);
    }
  }, [virtualizer]);

  return (
    <div
      className="mx-auto w-full max-w-3xl"
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        position: "relative",
        width: "100%",
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];

        if (row.kind === "user") {
          return (
            <div
              key={row.key}
              ref={measureElement}
              data-index={virtualRow.index}
              data-message-id={row.message.id}
              className="px-4 pb-4"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
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
              ref={measureElement}
              data-index={virtualRow.index}
              data-message-id={row.message.id}
              className="px-4 pb-4"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
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
          return (
            <div
              key={row.key}
              ref={measureElement}
              data-index={virtualRow.index}
              className="px-4 pb-4"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <LoadingSpinner />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
});
