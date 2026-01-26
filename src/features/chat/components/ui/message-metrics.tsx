"use client";

import { CheckIcon, CopyIcon, RefreshCwIcon, TextSelectIcon } from "lucide-react";

import type { CostBreakdown } from "~/app/api/chat/route";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { useChatUIStore } from "~/features/chat/store";
import { useCopyToClipboard } from "~/lib/hooks";
import { cn } from "~/lib/utils";

export type MessageMetricsData = {
  id: string;
  model: string | null;
  tokensPerSecond: string | null;
  totalTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  ttft: number | null;
  costUsd: CostBreakdown | null;
  content: string;
};

type MessageMetricsProps = {
  metrics: MessageMetricsData;
  onRetry: () => void;
  isRetrying?: boolean;
  variant?: "full" | "minimal";
  stopped?: boolean;
};

export function MessageMetrics({
  metrics,
  onRetry,
  isRetrying,
  variant = "full",
  stopped = false,
}: MessageMetricsProps) {
  const { copied, copy } = useCopyToClipboard({
    errorMessage: "Failed to copy message content",
  });
  const showRaw = useChatUIStore(state => state.rawMessageIds.has(metrics.id));
  const toggleRawMessage = useChatUIStore(state => state.toggleRawMessage);

  const handleCopy = () => copy(metrics.content);

  const formatCost = (cost: string) => {
    const num = Number.parseFloat(cost);
    if (num === 0)
      return "$0.00";
    return `$${num.toFixed(6)}`;
  };

  // legacy cost handling - old threads stored costUsd as a number
  if (typeof metrics.costUsd === "number") {
    const legacyTotalCost = metrics.costUsd as unknown as number;
    metrics.costUsd = {
      total: legacyTotalCost,
      model: legacyTotalCost,
      search: 0,
      extract: 0,
      ocr: 0,
    };
  }

  const isFree = metrics.costUsd?.total === 0;

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
          {/* Copy Button */}
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

          {/* Raw Markdown Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleRawMessage(metrics.id)}
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

          {/* Retry Button */}
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

          {/* Model + End Pill */}
          <div className="flex items-center gap-2 pl-1">
            {metrics.model && <span className="font-medium">{metrics.model}</span>}

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
      {/* Copy Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        title="Copy message content"
        className="h-6 w-6 p-0"
      >
        {copied
          ? <CheckIcon className="h-3.5 w-3.5" />
          : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
      </Button>

      {/* Raw Markdown Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRawMessage(metrics.id)}
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

      {/* Retry Button */}
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

      {/* Metrics Text */}
      <div className="flex items-center gap-2 pl-1">
        {metrics.model && <span className="font-medium">{metrics.model}</span>}

        {variant === "full" && metrics.model && (
          <span>•</span>
        )}

        {variant === "full" && metrics.tokensPerSecond && (
          <>
            <span>
              {Number.parseFloat(metrics.tokensPerSecond).toFixed(2)}
              {" "}
              tok/s
            </span>
            <span>•</span>
          </>
        )}

        {variant === "full" && metrics.totalTokens && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  {metrics.outputTokens?.toLocaleString()}
                  {" "}
                  tokens
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Input:
                {" "}
                {metrics.inputTokens?.toLocaleString() ?? 0}
                {" "}
                • Output:
                {" "}
                {metrics.outputTokens?.toLocaleString() ?? 0}
              </TooltipContent>
            </Tooltip>
            <span>•</span>
          </>
        )}

        {variant === "full" && metrics.ttft !== null && (
          <>
            <span>
              TTFT:
              {" "}
              {metrics.ttft}
              ms
            </span>
            <span>•</span>
          </>
        )}

        {variant === "full" && metrics.costUsd && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("cursor-help", isFree && "underline decoration-dotted")}>
                {formatCost(metrics.costUsd.total.toFixed(6))}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isFree
                ? (
                    <span>This model is either free, or pricing information is not available.</span>
                  )
                : (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between gap-4">
                        <span>Model:</span>
                        <span className="font-mono">{formatCost(metrics.costUsd.model.toFixed(6))}</span>
                      </div>
                      {Number.parseFloat(metrics.costUsd.search.toFixed(4)) > 0 && (
                        <div className="flex justify-between gap-4">
                          <span>Search:</span>
                          <span className="font-mono">{formatCost(metrics.costUsd.search.toFixed(6))}</span>
                        </div>
                      )}
                      {Number.parseFloat(metrics.costUsd.extract.toFixed(4)) > 0 && (
                        <div className="flex justify-between gap-4">
                          <span>Extract:</span>
                          <span className="font-mono">{formatCost(metrics.costUsd.extract.toFixed(6))}</span>
                        </div>
                      )}
                      {Number.parseFloat(metrics.costUsd.ocr.toFixed(4)) > 0 && (
                        <div className="flex justify-between gap-4">
                          <span>PDF OCR:</span>
                          <span className="font-mono">{formatCost(metrics.costUsd.ocr.toFixed(6))}</span>
                        </div>
                      )}
                      <div className="border-t pt-1 flex justify-between gap-4 font-medium">
                        <span>Total:</span>
                        <span className="font-mono">{formatCost(metrics.costUsd.total.toFixed(6))}</span>
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
