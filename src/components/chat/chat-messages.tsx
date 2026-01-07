/* eslint-disable react/no-array-index-key */
import { memo } from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { LoadingSpinner } from "./loading-spinner";
import { MemoizedMarkdown } from "./markdown";
import { MessageMetrics } from "./message-metrics";
import { SearchingSources } from "./searching-sources";
import { UserMessage } from "./user-message";

export const ChatMessages = memo(({
  messages,
  isLoading,
  searchEnabled,
}: {
  messages: ChatUIMessage[];
  isLoading?: boolean;
  searchEnabled?: boolean;
}) => {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 py-8">
      {messages.map((message, messageIndex) => {
        const textContent = message.parts
          .filter(part => part.type === "text")
          .map(part => (part as any).text)
          .join("");

        if (message.role === "user") {
          return <UserMessage key={message.id} content={textContent} />;
        }

        const sources = message.metadata?.sources || [];
        const isLastMessage = messageIndex === messages.length - 1;
        const isSearching = isLoading && isLastMessage && searchEnabled && sources.length === 0;

        return (
          <div key={message.id} className="group markdown text-base">
            {(isSearching || sources.length > 0) && (
              <SearchingSources sources={sources} isSearching={isSearching} />
            )}
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                return (
                  <MemoizedMarkdown
                    key={`part-${index}`}
                    id={`${message.id}-${index}`}
                    content={(part as any).text}
                  />
                );
              }
              return null;
            })}
            {message.metadata && (
              <MessageMetrics
                metrics={{
                  id: message.id,
                  model: message.metadata.model || null,
                  tokensPerSecond: message.metadata.tokensPerSecond.toFixed(2) || null,
                  totalTokens: message.metadata.inputTokens + message.metadata.outputTokens || null,
                  inputTokens: message.metadata.inputTokens || null,
                  outputTokens: message.metadata.outputTokens || null,
                  ttft: message.metadata.timeToFirstTokenMs || null,
                  costUsd: message.metadata.costUSD.toFixed(6) || null,
                  content: textContent,
                }}
                onRetry={() => { }}
                isRetrying={false}
              />
            )}
          </div>
        );
      })}
      {isLoading && <LoadingSpinner />}
    </div>
  );
});
