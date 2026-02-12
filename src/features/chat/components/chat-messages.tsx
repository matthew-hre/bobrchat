"use client";

import { AlertCircle, RefreshCwIcon } from "lucide-react";
import { memo, useMemo, useState } from "react";

import type { ChatUIMessage } from "~/features/chat/types";

import { Button } from "~/components/ui/button";
import { useChatUIStore } from "~/features/chat/store";
import {
  isReasoningPart,
  isTextPart,
  isToolPart,
} from "~/features/chat/types";
import { extractMessageText, MessageParts, MessagePartsContainer, normalizeReasoningText } from "~/features/chat/ui/parts";

import type { EditedMessagePayload } from "./messages/inline-message-editor";

import { EditableUserMessage } from "./messages/editable-user-message";
import { LoadingSpinner } from "./ui/loading-spinner";
import { MessageMetrics } from "./ui/message-metrics";

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
  const stoppedAssistantMessageInfoById = useChatUIStore(state => state.stoppedAssistantMessageInfoById);
  const searchEnabled = useChatUIStore(state => state.searchEnabled);
  const rawMessageIds = useChatUIStore(state => state.rawMessageIds);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const canEditMessages = !isLoading && !isRegenerating && !isEditSubmitting;

  const hasRenderableAssistantContent = (parts: ChatUIMessage["parts"]) => {
    for (const part of parts) {
      if (isTextPart(part) && part.text.trim().length > 0) {
        return true;
      }

      if (isReasoningPart(part) && normalizeReasoningText(part.text)) {
        return true;
      }

      if (isToolPart(part)) {
        return true;
      }
    }

    return false;
  };

  // Filter out duplicate incomplete assistant messages
  // When a response is stopped, there may be two messages with the same tool calls or reasoning -
  // one incomplete (not marked stopped) and one properly marked as stopped
  const filteredMessages = useMemo(() => {
    const stats = {
      totalMessages: messages.length,
      stoppedMessages: 0,
      duplicatesRemoved: 0,
      signatureExtractions: 0,
      partsIterated: 0,
    };

    // Single-pass signature extraction helper
    // Extracts tool, reasoning, and text signatures in one iteration over parts
    const extractSignatures = (parts: ChatUIMessage["parts"]) => {
      const toolIds: string[] = [];
      const reasoningTexts: string[] = [];
      const textParts: string[] = [];

      for (const part of parts) {
        stats.partsIterated++;
        if (isToolPart(part)) {
          toolIds.push(part.toolCallId);
        }
        else if (isReasoningPart(part)) {
          reasoningTexts.push(part.text || "");
        }
        else if (isTextPart(part)) {
          textParts.push(part.text);
        }
      }

      // Truncate text-based signatures to limit memory usage
      const reasoningText = reasoningTexts.join("").slice(0, 200);
      const textContent = textParts.join("").slice(0, 200);

      return {
        tool: toolIds.length > 0 ? `tool:${toolIds.sort().join("|")}` : null,
        reasoning: reasoningText ? `reasoning:${reasoningText}` : null,
        text: textContent ? `text:${textContent}` : null,
      };
    };

    // First pass: collect stopped message signatures and track candidate duplicates
    const stoppedSignatures = new Set<string>();
    const candidateDuplicates: Array<{ index: number }> = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (message.role !== "assistant")
        continue;

      if (message.stoppedByUser === true) {
        stats.stoppedMessages++;
        stats.signatureExtractions++;
        const sigs = extractSignatures(message.parts);
        if (sigs.tool)
          stoppedSignatures.add(sigs.tool);
        if (sigs.reasoning)
          stoppedSignatures.add(sigs.reasoning);
        if (sigs.text)
          stoppedSignatures.add(sigs.text);
      }
      else {
        candidateDuplicates.push({ index: i });
      }
    }

    // Early exit: no stopped messages means no duplicates possible
    if (stoppedSignatures.size === 0) {
      return messages;
    }

    // Extract signatures for candidate duplicates and build exclusion set
    const excludeIndices = new Set<number>();
    for (const candidate of candidateDuplicates) {
      stats.signatureExtractions++;
      const sigs = extractSignatures(messages[candidate.index].parts);

      const isDuplicate
        = (sigs.tool && stoppedSignatures.has(sigs.tool))
          || (sigs.reasoning && stoppedSignatures.has(sigs.reasoning))
          || (sigs.text && stoppedSignatures.has(sigs.text));

      if (isDuplicate) {
        stats.duplicatesRemoved++;
        excludeIndices.add(candidate.index);
      }
    }

    const result = messages.filter((_, i) => !excludeIndices.has(i));

    return result;
  }, [messages]);

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
        const textContent = extractMessageText(message.parts);

        if (message.role === "user") {
          const nextMessage = filteredMessages[messageIndex + 1];
          const previousModelId = message.modelId
            || (nextMessage?.role === "assistant"
              ? (nextMessage.metadata?.model || nextMessage.stoppedModelId || stoppedAssistantMessageInfoById[nextMessage.id]?.modelId || null)
              : null);

          return (
            <EditableUserMessage
              key={message.id}
              message={message}
              previousModelId={previousModelId}
              isEditing={editingMessageId === message.id}
              onStartEdit={() => handleStartEdit(message.id)}
              onCancelEdit={handleCancelEdit}
              onSubmitEdit={payload => handleSubmitEdit(message.id, payload)}
              canEdit={canEditMessages && !!onEditMessage}
              isSubmitting={isEditSubmitting}
            />
          );
        }

        const isLastMessage = messageIndex === filteredMessages.length - 1;

        const stoppedInfo = stoppedAssistantMessageInfoById[message.id];
        const persistedStopped = message.stoppedByUser === true;
        const stoppedModelId = message.stoppedModelId as string | null | undefined;
        const isStopped = persistedStopped || !!stoppedInfo;
        const showRaw = rawMessageIds.has(message.id);
        const metadata = message.metadata;
        const isEmptyResponse = !!metadata
          && metadata.inputTokens === 0
          && metadata.outputTokens === 0
          && !hasRenderableAssistantContent(message.parts);
        const showEmptyResponseNotice = isEmptyResponse && !isStopped && !isLoading;

        return (
          <div key={message.id} className="group markdown text-base">
            <MessagePartsContainer showRaw={showRaw}>
              <MessageParts
                messageId={message.id}
                parts={message.parts}
                mode="active"
                renderState={{
                  isLast: isLastMessage,
                  showRaw,
                  isStopped,
                  searchEnabled,
                  isLoading: isLoading ?? false,
                }}
              />
            </MessagePartsContainer>

            {showEmptyResponseNotice && (
              <div className={
                `
                  border-warning/50 bg-warning/10 text-warning-foreground mt-3
                  flex items-start gap-3 rounded-md border p-3 text-sm
                `
              }
              >
                <AlertCircle className="text-warning mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold">No response from the model</div>
                  <div className="text-warning-foreground/80 text-xs">
                    The provider returned zero tokens. This is likely a model-side issue. Try regenerating the response.
                  </div>
                </div>
                {onRegenerate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => onRegenerate(message.id)}
                    disabled={isRegenerating}
                  >
                    <RefreshCwIcon className={isRegenerating ? "animate-spin" : ""} size={14} />
                    Regenerate
                  </Button>
                )}
              </div>
            )}

            {/* TODO: Add mobile support for message metrics - hidden on touch devices */}
            {(message.metadata || isStopped) && (
              <div className="touch-device-hidden">
                <MessageMetrics
                  messageId={message.id}
                  metadata={message.metadata}
                  fallbackModel={stoppedModelId || stoppedInfo?.modelId || (isStopped ? "unknown" : null)}
                  content={textContent}
                  onRetry={() => onRegenerate?.(message.id)}
                  isRetrying={isRegenerating}
                  variant={isStopped ? "minimal" : "full"}
                  stopped={isStopped}
                />
              </div>
            )}
          </div>
        );
      })}
      {isLoading && <LoadingSpinner />}
    </div>
  );
});
