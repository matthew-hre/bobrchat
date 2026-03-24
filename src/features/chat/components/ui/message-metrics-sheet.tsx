"use client";

import { CheckIcon, CopyIcon, RefreshCwIcon, TextSelectIcon } from "lucide-react";

import type { CostBreakdown, MessageMetadata } from "~/features/chat/types";

import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useChatUIStore } from "~/features/chat/store";
import { useCopyToClipboard } from "~/lib/hooks";
import { cn } from "~/lib/utils";

type MessageMetricsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  metadata: MessageMetadata | undefined;
  fallbackModel: string | null;
  content: string;
  onRetry: () => void;
  isRetrying?: boolean;
  stopped?: boolean;
};

type LegacyCostBreakdown = CostBreakdown & { model?: number };

function normalizeCostUsd(costUsd: LegacyCostBreakdown | number | undefined): CostBreakdown | null {
  if (!costUsd) return null;
  if (typeof costUsd === "number") {
    return { promptCost: costUsd, completionCost: 0, total: costUsd, search: 0, extract: 0, ocr: 0 };
  }
  if ("model" in costUsd && typeof costUsd.model === "number") {
    const { model, ...rest } = costUsd;
    return {
      ...rest,
      completionCost: rest.completionCost + model,
      total: rest.total,
    };
  }
  return costUsd;
}

function formatCost(cost: number) {
  if (cost === 0) return "$0.00";
  return `$${cost.toFixed(6)}`;
}

export function MessageMetricsSheet({
  open,
  onOpenChange,
  messageId,
  metadata,
  fallbackModel,
  content,
  onRetry,
  isRetrying,
  stopped = false,
}: MessageMetricsSheetProps) {
  const { copied, copy } = useCopyToClipboard({
    errorMessage: "Failed to copy message content",
  });
  const showRaw = useChatUIStore(state => state.rawMessageIds.has(messageId));
  const toggleRawMessage = useChatUIStore(state => state.toggleRawMessage);

  const model = metadata?.model ?? fallbackModel;
  const costUsd = normalizeCostUsd(metadata?.costUSD as CostBreakdown | number | undefined);
  const isFree = costUsd?.total === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl gap-0">
        <SheetHeader>
          <SheetTitle className="text-sm">
            {stopped ? "Stopped Response" : "Message Info"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                copy(content);
              }}
              className="h-8 gap-2"
            >
              {copied
                ? <CheckIcon className="h-3.5 w-3.5" />
                : <CopyIcon className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleRawMessage(messageId)}
              className={cn("h-8 gap-2", showRaw && "text-primary")}
            >
              <TextSelectIcon className="h-3.5 w-3.5" />
              {showRaw ? "Formatted" : "Raw"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onRetry();
                onOpenChange(false);
              }}
              disabled={isRetrying}
              className="h-8 gap-2"
            >
              <RefreshCwIcon className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} />
              Regenerate
            </Button>
          </div>

          {/* Metrics */}
          {model && (
            <div className="text-muted-foreground flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span>Model</span>
                <span className="font-medium">{model}</span>
              </div>

              {!stopped && metadata && (
                <>
                  <div className="flex justify-between">
                    <span>Speed</span>
                    <span className="font-medium">{metadata.tokensPerSecond.toFixed(2)} tok/s</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Tokens</span>
                    <span className="font-medium">
                      {metadata.inputTokens.toLocaleString()} in / {metadata.outputTokens.toLocaleString()} out
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>TTFT</span>
                    <span className="font-medium">{metadata.timeToFirstTokenMs}ms</span>
                  </div>
                </>
              )}

              {!stopped && costUsd && (
                <>
                  <div className="bg-border my-1 h-px" />
                  <div className="flex justify-between">
                    <span>Total Cost</span>
                    <span className={cn("font-medium", isFree && "underline decoration-dotted")}>
                      {formatCost(costUsd.total)}
                    </span>
                  </div>

                  {!isFree && (
                    <div className="text-muted-foreground/70 flex flex-col gap-1 pl-2 text-xs">
                      {costUsd.promptCost > 0.000001 && (
                        <div className="flex justify-between">
                          <span>Prompt</span>
                          <span className="font-mono">{formatCost(costUsd.promptCost)}</span>
                        </div>
                      )}
                      {costUsd.completionCost > 0.000001 && (
                        <div className="flex justify-between">
                          <span>Completion</span>
                          <span className="font-mono">{formatCost(costUsd.completionCost)}</span>
                        </div>
                      )}
                      {costUsd.search > 0.000001 && (
                        <div className="flex justify-between">
                          <span>Search</span>
                          <span className="font-mono">{formatCost(costUsd.search)}</span>
                        </div>
                      )}
                      {costUsd.extract > 0.000001 && (
                        <div className="flex justify-between">
                          <span>Extract</span>
                          <span className="font-mono">{formatCost(costUsd.extract)}</span>
                        </div>
                      )}
                      {costUsd.ocr > 0.000001 && (
                        <div className="flex justify-between">
                          <span>PDF OCR</span>
                          <span className="font-mono">{formatCost(costUsd.ocr)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
