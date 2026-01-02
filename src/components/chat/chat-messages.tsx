import type { ChatUIMessage } from "~/app/api/chat/route";

import { LoadingSpinner } from "./loading-spinner";
import { MemoizedMarkdown } from "./markdown";
import { MessageMetrics } from "./message-metrics";
import { UserMessage } from "./user-message";

export function ChatMessages({
  messages,
  isLoading,
}: {
  messages: ChatUIMessage[];
  isLoading?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 py-8">
      {messages.map((message) => {
        const textContent = message.parts
          .filter(part => part.type === "text")
          .map(part => part.text)
          .join("");

        if (message.role === "user") {
          return <UserMessage key={message.id} content={textContent} />;
        }

        return (
          <div key={message.id} className="group markdown text-base">
            <MemoizedMarkdown
              key={`${message.id}-text`}
              id={message.id}
              content={textContent}
            />
            {message.metadata && (
              <MessageMetrics
                metrics={{
                  id: message.id,
                  model: message.metadata.model || null,
                  tokensPerSecond: message.metadata.tokensPerSecond.toFixed(2) || null,
                  totalTokens: message.metadata.inputTokens + message.metadata.outputTokens || null,
                  ttft: message.metadata.timeToFirstTokenMs || null,
                  costUsd: message.metadata.costUSD.toFixed(6) || null,
                  content: textContent,

                }}
                onRetry={() => {}}
                isRetrying={false}
              />
            )}
          </div>
        );
      })}
      {isLoading && <LoadingSpinner />}
    </div>
  );
}
