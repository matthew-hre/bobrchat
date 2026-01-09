"use client";

import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

export type MessageMetricsData = {
  id: string;
  model: string | null;
  tokensPerSecond: string | null;
  totalTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  ttft: number | null;
  costUsd: string | null;
  content: string;
  sourceCount: number | null;
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(metrics.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy message content");
    }
  };

  // Format cost with proper USD formatting
  const formatCost = (cost: string | null) => {
    if (!cost || cost === "0")
      return "$0.00";
    const num = Number.parseFloat(cost);
    return `$${num.toFixed(6)}`;
  };

  if (stopped) {
    return (
      <div className="text-muted-foreground relative mt-2 h-6 text-xs">
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

          {/* Retry Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            title="Regenerate response"
            className="h-6 w-6 p-0"
          >
            <RefreshCwIcon className="h-3.5 w-3.5" />
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

      {/* Retry Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        title="Regenerate response"
        className="h-6 w-6 p-0"
      >
        <RefreshCwIcon className="h-3.5 w-3.5" />
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
          metrics.costUsd === "0.000000"
            ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted">
                      {formatCost(metrics.costUsd)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    This model is either free, or pricing information is not available.
                  </TooltipContent>
                </Tooltip>
              )
            : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      {formatCost(metrics.costUsd)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    This cost is an estimate based on model usage and may vary.
                  </TooltipContent>
                </Tooltip>
              )
        )}
      </div>
    </div>
  );
}
