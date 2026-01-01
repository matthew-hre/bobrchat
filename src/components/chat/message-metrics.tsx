"use client";

import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";

export type MessageMetricsData = {
  id: string;
  model: string | null;
  tokensPerSecond: string | null;
  totalTokens: number | null;
  ttft: number | null;
  costUsd: string | null;
  content: string;
};

type MessageMetricsProps = {
  metrics: MessageMetricsData;
  onRetry: () => void;
  isRetrying?: boolean;
};

export function MessageMetrics({
  metrics,
  onRetry,
  isRetrying,
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
    }
  };

  // Format cost with proper USD formatting
  const formatCost = (cost: string | null) => {
    if (!cost || cost === "0")
      return "$0.00";
    const num = Number.parseFloat(cost);
    return `$${num.toFixed(6)}`;
  };

  return (
    <div
      className={`
        text-muted-foreground mt-2 flex items-center gap-3 text-xs opacity-0
        transition-opacity duration-200
        group-hover:opacity-100
      `}
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
        {metrics.model && (
          <>
            <span className="font-medium">{metrics.model}</span>
            <span>•</span>
          </>
        )}

        {metrics.tokensPerSecond && (
          <>
            <span>
              {Number.parseFloat(metrics.tokensPerSecond).toFixed(2)}
              {" "}
              tok/s
            </span>
            <span>•</span>
          </>
        )}

        {metrics.totalTokens && (
          <>
            <span>
              {metrics.totalTokens.toLocaleString()}
              {" "}
              tokens
            </span>
            <span>•</span>
          </>
        )}

        {metrics.ttft !== null && (
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

        {metrics.costUsd && <span>{formatCost(metrics.costUsd)}</span>}
      </div>
    </div>
  );
}
