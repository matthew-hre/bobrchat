/* eslint-disable react/no-array-index-key */
"use client";

import { memo, useState } from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { useChatUIStore } from "~/features/chat/store";

import type { EditedMessagePayload } from "./messages/inline-message-editor";

import { EditableUserMessage } from "./messages/editable-user-message";
import { MemoizedMarkdown } from "./messages/markdown";
import { LoadingSpinner } from "./ui/loading-spinner";
import { MessageMetrics } from "./ui/message-metrics";
import { ReasoningContent } from "./ui/reasoning-content";
import { SearchingSources } from "./ui/searching-sources";

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const canEditMessages = !isLoading && !isRegenerating && !isEditSubmitting;

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
      {messages.map((message, messageIndex) => {
        const textContent = message.parts
          .filter(part => part.type === "text")
          .map(part => part.text)
          .join("");

        if (message.role === "user") {
          const nextMessage = messages[messageIndex + 1];
          const previousModelId = nextMessage?.role === "assistant"
            ? (nextMessage.metadata?.model || nextMessage.stoppedModelId || stoppedAssistantMessageInfoById[nextMessage.id]?.modelId || null)
            : null;

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

        const isLastMessage = messageIndex === messages.length - 1;

        const stoppedInfo = stoppedAssistantMessageInfoById[message.id];
        const persistedStopped = message.stoppedByUser === true;
        const stoppedModelId = message.stoppedModelId as string | null | undefined;
        const isStopped = persistedStopped || !!stoppedInfo;

        return (
          <div key={message.id} className="group markdown text-base">
            {message.parts.map((part, index) => {
              if (part.type === "reasoning") {
                const reasoningPart = part as {
                  type: "reasoning";
                  text: string;
                  state?: string;
                };

                // Strip [REDACTED] (including leading newlines before it) and skip if empty
                const cleanedText = (reasoningPart.text || "")
                  .replace(/\n\s*\[REDACTED\]/g, "") // Remove newlines before [REDACTED]
                  .replace(/\[REDACTED\]/g, "") // Remove any remaining [REDACTED]
                  .replace(/\\n/g, "\n") // Unescape literal \n to actual newlines
                  .replace(/\n\s*\n/g, "\n") // Collapse multiple newlines to single
                  .trim();
                if (!cleanedText) {
                  return null;
                }

                const isThinking = reasoningPart.state !== "done";
                return (
                  <ReasoningContent
                    key={`part-${index}`}
                    content={cleanedText}
                    isThinking={isThinking}
                  />
                );
              }

              if (part.type === "text") {
                return (
                  <MemoizedMarkdown
                    key={`part-${index}`}
                    id={`${message.id}-${index}`}
                    content={part.text}
                  />
                );
              }

              const isSearchTool = part.type === "tool-search"
                || (part.type === "tool-invocation" && (part as any).toolName === "search");

              if (isSearchTool) {
                let sources: any[] = [];
                let isSearching = false;

                const sp = part as any;

                // Handle "tool-search" (likely from DB persistence or custom format)
                if (sp.type === "tool-search") {
                  if (sp.output?.results && Array.isArray(sp.output.results)) {
                    sources = sp.output.results.map((r: any) => ({
                      id: r.url || Math.random().toString(),
                      sourceType: "url",
                      url: r.url,
                      title: r.title,
                    }));
                  }
                  // If we have a search part but no output/results yet, we are likely searching
                  isSearching = !sp.output && sp.state !== "done" && sp.state !== "output-available";
                }
                // Handle "tool-invocation" (standard AI SDK during stream)
                else if (sp.type === "tool-invocation") {
                  if (sp.state === "result") {
                    const result = sp.result;
                    const results = result?.results || (Array.isArray(result) ? result : []);
                    sources = results.map((r: any) => ({
                      id: r.url || Math.random().toString(),
                      sourceType: "url",
                      url: r.url,
                      title: r.title,
                    }));
                  }
                  else {
                    isSearching = true;
                  }
                }

                return (
                  <SearchingSources
                    key={`part-${index}`}
                    sources={sources}
                    isSearching={isSearching}
                  />
                );
              }

              return null;
            })}

            {/* Fallback for initial searching state before any parts or tool calls exist */}
            {isLoading && isLastMessage && searchEnabled && message.parts.length === 0 && (
              <SearchingSources sources={[]} isSearching={true} />
            )}

            {(message.metadata || isStopped) && (
              <MessageMetrics
                metrics={{
                  id: message.id,
                  model: message.metadata?.model || stoppedModelId || stoppedInfo?.modelId || (isStopped ? "unknown" : null),
                  tokensPerSecond: message.metadata ? message.metadata.tokensPerSecond.toFixed(2) : null,
                  totalTokens: message.metadata ? message.metadata.inputTokens + message.metadata.outputTokens : null,
                  inputTokens: message.metadata ? message.metadata.inputTokens : null,
                  outputTokens: message.metadata ? message.metadata.outputTokens : null,
                  ttft: message.metadata ? message.metadata.timeToFirstTokenMs : null,
                  costUsd: message.metadata
                    ? message.metadata.costUSD
                    : null,
                  content: textContent,
                  sourceCount: message.metadata?.sources ? message.metadata.sources.length : null,
                }}
                onRetry={() => onRegenerate?.(message.id)}
                isRetrying={isRegenerating}
                variant={isStopped ? "minimal" : "full"}
                stopped={isStopped}
              />
            )}
          </div>
        );
      })}
      {isLoading && <LoadingSpinner />}
    </div>
  );
});
