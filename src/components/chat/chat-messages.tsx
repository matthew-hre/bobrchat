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

        const isLastMessage = messageIndex === messages.length - 1;

        return (
          <div key={message.id} className="group markdown text-base">
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
