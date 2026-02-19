"use client";

import { AlertCircle, RefreshCwIcon } from "lucide-react";
import { memo } from "react";

import type { ChatUIMessage } from "~/features/chat/types";

import { Button } from "~/components/ui/button";
import { useChatUIStore } from "~/features/chat/store";
import {
  isReasoningPart,
  isTextPart,
  isToolPart,
} from "~/features/chat/types";
import { extractMessageText, MessageParts, MessagePartsContainer, normalizeReasoningText } from "~/features/chat/ui/parts";

import { MessageMetrics } from "../ui/message-metrics";

function hasRenderableAssistantContent(parts: ChatUIMessage["parts"]) {
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
}

type AssistantMessageProps = {
  message: ChatUIMessage;
  isLastMessage: boolean;
  isLoading: boolean;
  searchEnabled: boolean;
  onRegenerate?: (messageId: string) => void;
  isRegenerating?: boolean;
};

export const AssistantMessage = memo(({
  message,
  isLastMessage,
  isLoading,
  searchEnabled,
  onRegenerate,
  isRegenerating,
}: AssistantMessageProps) => {
  const stoppedInfo = useChatUIStore(state => state.stoppedAssistantMessageInfoById[message.id]);
  const showRaw = useChatUIStore(state => state.rawMessageIds.has(message.id));

  const textContent = extractMessageText(message.parts);

  const persistedStopped = message.stoppedByUser === true;
  const stoppedModelId = message.stoppedModelId as string | null | undefined;
  const isStopped = persistedStopped || !!stoppedInfo;
  const metadata = message.metadata;
  const isEmptyResponse = !!metadata
    && metadata.inputTokens === 0
    && metadata.outputTokens === 0
    && !hasRenderableAssistantContent(message.parts);
  const showEmptyResponseNotice = isEmptyResponse && !isStopped && !isLoading;

  return (
    <div className="group markdown text-base">
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
            isLoading,
          }}
        />
      </MessagePartsContainer>

      {showEmptyResponseNotice && (
        <div className={
          `
            border-warning/50 bg-warning/10 text-warning-foreground mt-3 flex
            items-start gap-3 rounded-md border p-3 text-sm
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
});
