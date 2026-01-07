/* eslint-disable react/no-array-index-key */
import { memo } from "react";

import type { ChatUIMessage, SourceInfo } from "~/app/api/chat/route";

import { LoadingSpinner } from "./loading-spinner";
import { MemoizedMarkdown } from "./markdown";
import { MessageMetrics } from "./message-metrics";
import { SearchingSources } from "./searching-sources";
import { UserMessage } from "./user-message";

// Constants for search tool state
const SEARCH_SEARCHING_STATES = ["input-streaming", "input-available", "call", "partial-call"] as const;
const SEARCH_RESULT_STATES = ["result", "output-available"] as const;

// Helper to extract search results from tool output
function extractSearchResults(output: unknown): SourceInfo[] {
  if (!output)
    return [];

  try {
    const data = typeof output === "string" ? JSON.parse(output) : output;
    const items = Array.isArray(data) ? data : data.results || [];

    return items
      .filter((item: any) => item.url)
      .map((item: any) => ({
        id: item.url,
        sourceType: "url" as const,
        url: item.url,
        title: item.title,
      }));
  }
  catch (e) {
    console.error("Failed to parse search output", e);
    return [];
  }
}

// Helper to get search tool state info from message part
function getSearchToolState(part: any): { state?: string; isSearchPart: boolean } {
  // Check tool-search type (Vercel AI SDK v6)
  if (part.type === "tool-search") {
    return {
      state: part.state,
      isSearchPart: true,
    };
  }

  // Check tool-invocation type with search tool
  if (part.type === "tool-invocation") {
    const toolInvocation = part as any;
    if (toolInvocation.toolName === "search" || toolInvocation.toolInvocation?.toolName === "search") {
      return {
        state: toolInvocation.state || toolInvocation.toolInvocation?.state,
        isSearchPart: true,
      };
    }
  }

  // Check dynamic-tool or other types
  if ((part as any).toolName === "search") {
    return {
      state: (part as any).state,
      isSearchPart: true,
    };
  }

  return { isSearchPart: false };
}

export const ChatMessages = memo(({
  messages,
  isLoading,
}: {
  messages: ChatUIMessage[];
  isLoading?: boolean;
}) => {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 py-8">
      {messages.map((message) => {
        const textContent = message.parts
          .filter(part => part.type === "text")
          .map(part => (part as any).text)
          .join("");

        if (message.role === "user") {
          return <UserMessage key={message.id} content={textContent} />;
        }

        const contentToRender: React.ReactNode[] = [];
        const inlineSourcesFound: SourceInfo[] = [];

        // Process message parts
        if (message.parts?.length) {
          message.parts.forEach((part, index) => {
            if (part.type === "text") {
              contentToRender.push(
                <MemoizedMarkdown
                  key={`part-${index}`}
                  id={`${message.id}-${index}`}
                  content={(part as any).text}
                />,
              );
              return;
            }

            const { state, isSearchPart } = getSearchToolState(part);
            if (!isSearchPart)
              return;

            // Show searching state
            if (state && SEARCH_SEARCHING_STATES.includes(state as any)) {
              contentToRender.push(
                <SearchingSources
                  key={`part-${index}`}
                  sources={[]}
                  isSearching={true}
                />,
              );
              return;
            }

            // Show results
            if (state && SEARCH_RESULT_STATES.includes(state as any)) {
              const searchOutput = (part as any).output || (part as any).result;
              const sources = extractSearchResults(searchOutput);

              if (sources.length > 0) {
                inlineSourcesFound.push(...sources);
                contentToRender.push(
                  <SearchingSources
                    key={`part-${index}`}
                    sources={sources}
                  />,
                );
              }
            }
          });
        }

        // Add remaining metadata sources
        const metadataSources = message.metadata?.sources || [];
        const renderedUrls = new Set(inlineSourcesFound.map(s => s.url));
        const remainingSources = metadataSources.filter(s => s.url && !renderedUrls.has(s.url));

        if (remainingSources.length > 0) {
          contentToRender.unshift(
            <SearchingSources key="metadata-sources" sources={remainingSources} />,
          );
        }

        return (
          <div key={message.id} className="group markdown text-base">
            {contentToRender}
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
