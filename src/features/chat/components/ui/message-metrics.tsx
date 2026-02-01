"use client";

import { CheckIcon, CopyIcon, RefreshCwIcon, TextSelectIcon } from "lucide-react";

import type { CostBreakdown, MessageMetadata } from "~/app/api/chat/route";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { useChatUIStore } from "~/features/chat/store";
import { useCopyToClipboard } from "~/lib/hooks";
import { cn } from "~/lib/utils";

type MessageMetricsProps = {
  messageId: string;
  metadata: MessageMetadata | undefined;
  fallbackModel: string | null;
  content: string;
  onRetry: () => void;
  isRetrying?: boolean;
  variant?: "full" | "minimal";
  stopped?: boolean;
};

type LegacyCostBreakdown = CostBreakdown & { model?: number };

function normalizeCostUsd(costUsd: LegacyCostBreakdown | number | undefined): CostBreakdown | null {
  if (!costUsd) return null;
  if (typeof costUsd === "number") {
    return { promptCost: costUsd, completionCost: 0, total: costUsd, search: 0, extract: 0, ocr: 0 };
  }
  // Handle legacy `model` field - treat it as completionCost
  if ("model" in costUsd && typeof costUsd.model === "number") {
    const { model, ...rest } = costUsd;
    return {
      ...rest,
      completionCost: rest.completionCost + model,
      total: rest.total, // total already includes model cost
    };
  }
  return costUsd;
}

export function MessageMetrics({
  messageId,
  metadata,
  fallbackModel,
  content,
  onRetry,
  isRetrying,
  variant = "full",
  stopped = false,
}: MessageMetricsProps) {
  const { copied, copy } = useCopyToClipboard({
    errorMessage: "Failed to copy message content",
  });
  const showRaw = useChatUIStore(state => state.rawMessageIds.has(messageId));
  const toggleRawMessage = useChatUIStore(state => state.toggleRawMessage);

  const handleCopy = () => copy(content);

  const formatCost = (cost: number) => {
    if (cost === 0) return "$0.00";
    return `$${cost.toFixed(6)}`;
  };

  const model = metadata?.model ?? fallbackModel;
  const costUsd = normalizeCostUsd(metadata?.costUSD as CostBreakdown | number | undefined);
  const isFree = costUsd?.total === 0;

  if (stopped) {
    return (
      <div className="text-muted-foreground relative mt-1 h-6 text-xs">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "absolute top-0 left-0 h-6 transition-all duration-200",
                `
                  group-hover:pointer-events-none group-hover:-translate-y-0.5
                  group-hover:opacity-0
                `,
              )}
            >
              Stopped
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">Stopped by you</TooltipContent>
        </Tooltip>

        <div
          className={cn(
            "flex h-6 items-center gap-3 transition-opacity duration-200",
            "pointer-events-none opacity-0",
            "group-hover:pointer-events-auto group-hover:opacity-100",
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            title="Copy message content"
            className="h-6 w-6 p-0"
          >
            {copied
              ? <CheckIcon className="h-3.5 w-3.5" />
              : <CopyIcon className="h-3.5 w-3.5" />}
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleRawMessage(messageId)}
                title={showRaw ? "Show formatted" : "Show raw markdown"}
                className={cn("h-6 w-6 p-0", showRaw && "text-primary")}
              >
                <TextSelectIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {showRaw ? "Show formatted" : "Show raw markdown"}
            </TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            title="Regenerate response"
            className="h-6 w-6 p-0"
          >
            <RefreshCwIcon className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} />
          </Button>

          <div className="flex items-center gap-2 pl-1">
            {model && <span className="font-medium">{model}</span>}

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "translate-y-0.5 opacity-0 transition-all duration-200",
                    "group-hover:translate-y-0 group-hover:opacity-100",
                  )}
                >
                  Stopped
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">Stopped by you</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        `
          text-muted-foreground mt-2 flex items-center gap-3 text-xs
          transition-opacity duration-200
        `,
        `
          opacity-0
          group-hover:opacity-100
        `,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        title="Copy message content"
        className="h-6 w-6 p-0"
      >
        {copied
          ? <CheckIcon className="h-3.5 w-3.5" />
          : <CopyIcon className="h-3.5 w-3.5" />}
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRawMessage(messageId)}
            title={showRaw ? "Show formatted" : "Show raw markdown"}
            className={cn("h-6 w-6 p-0", showRaw && "text-primary")}
          >
            <TextSelectIcon className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {showRaw ? "Show formatted" : "Show raw markdown"}
        </TooltipContent>
      </Tooltip>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        title="Regenerate response"
        className="h-6 w-6 p-0"
      >
        <RefreshCwIcon className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} />
      </Button>

      <div className="flex items-center gap-2 pl-1">
        {model && <span className="font-medium">{model}</span>}

        {variant === "full" && model && <span>•</span>}

        {variant === "full" && metadata && (
          <>
            <span>{metadata.tokensPerSecond.toFixed(2)} tok/s</span>
            <span>•</span>
          </>
        )}

        {variant === "full" && metadata && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  {metadata.outputTokens.toLocaleString()} tokens
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Input: {metadata.inputTokens.toLocaleString()} • Output: {metadata.outputTokens.toLocaleString()}
              </TooltipContent>
            </Tooltip>
            <span>•</span>
          </>
        )}

        {variant === "full" && metadata && (
          <>
            <span>TTFT: {metadata.timeToFirstTokenMs}ms</span>
            <span>•</span>
          </>
        )}

        {variant === "full" && costUsd && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("cursor-help", isFree && "underline decoration-dotted")}>
                {formatCost(costUsd.total)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isFree
                ? <span>This model is either free, or pricing information is not available.</span>
                : (
                    <div className="flex flex-col gap-1">
                      {costUsd.promptCost > 0.000001 && (
                        <div className="flex justify-between gap-4">
                          <span>Prompt:</span>
                          <span className="font-mono">{formatCost(costUsd.promptCost)}</span>
                        </div>
                      )}
                      {costUsd.completionCost > 0.000001 && (
                        <div className="flex justify-between gap-4">
                          <span>Completion:</span>
                          <span className="font-mono">{formatCost(costUsd.completionCost)}</span>
                        </div>
                      )}

                      {costUsd.search > 0.000001 && (
                        <div className="flex justify-between gap-4">
                          <span>Search:</span>
                          <span className="font-mono">{formatCost(costUsd.search)}</span>
                        </div>
                      )}
                      {costUsd.extract > 0.000001 && (
                        <div className="flex justify-between gap-4">
                          <span>Extract:</span>
                          <span className="font-mono">{formatCost(costUsd.extract)}</span>
                        </div>
                      )}
                      {costUsd.ocr > 0.000001 && (
                        <div className="flex justify-between gap-4">
                          <span>PDF OCR:</span>
                          <span className="font-mono">{formatCost(costUsd.ocr)}</span>
                        </div>
                      )}
                      <div className="border-t pt-1 flex justify-between gap-4 font-medium">
                        <span>Total:</span>
                        <span className="font-mono">{formatCost(costUsd.total)}</span>
                      </div>
                    </div>
                  )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
