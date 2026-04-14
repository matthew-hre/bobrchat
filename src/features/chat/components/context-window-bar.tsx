"use client";

import { useMemo, useState } from "react";

import type { ChatUIMessage } from "~/features/chat/types";

import { cn } from "~/lib/utils";

type ContextWindowBarProps = {
  messages: ChatUIMessage[];
  contextLength: number;
  displayMode: "disabled" | "auto" | "always";
};

export function ContextWindowBar({
  messages,
  contextLength,
  displayMode,
}: ContextWindowBarProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { usedTokens, percentage } = useMemo(() => {
    // Estimate context window usage by summing content that accumulates in history.
    //
    // We avoid using inputTokens from metadata because totalUsage.inputTokens
    // is summed across all multi-step tool calls (search → extract → respond),
    // dramatically over-counting the actual context size.
    //
    // Instead we estimate from the actual message content:
    // - Assistant text/reasoning parts: estimate from character count (÷4)
    // - Tool result parts: estimate from serialized output size (÷4)
    //   (search sources, extracted content — these are the largest contributors)
    // - User messages: estimate from character count (÷4)
    // - Baseline: ~500 tokens for system prompt + tool definitions
    const CHARS_PER_TOKEN = 4;
    const SYSTEM_PROMPT_BASELINE = 500;
    let total = SYSTEM_PROMPT_BASELINE;

    for (const msg of messages) {
      if (!msg.parts) continue;

      for (const part of msg.parts) {
        if (part.type === "text") {
          total += Math.ceil(((part as { text: string }).text?.length ?? 0) / CHARS_PER_TOKEN);
        }
        else if (part.type === "reasoning") {
          total += Math.ceil(((part as { text: string }).text?.length ?? 0) / CHARS_PER_TOKEN);
        }
        else if (part.type.startsWith("tool-")) {
          const toolPart = part as { input?: unknown; output?: unknown };
          const inputSize = toolPart.input ? JSON.stringify(toolPart.input).length : 0;
          const outputSize = toolPart.output ? JSON.stringify(toolPart.output).length : 0;
          total += Math.ceil((inputSize + outputSize) / CHARS_PER_TOKEN);
        }
        else if (part.type === "file") {
          // File parts contribute their URL/data length
          total += Math.ceil(((part as { url?: string }).url?.length ?? 0) / CHARS_PER_TOKEN);
        }
      }
    }

    const pct = contextLength > 0 ? Math.min((total / contextLength) * 100, 100) : 0;
    return { usedTokens: total, percentage: pct };
  }, [messages, contextLength]);

  if (displayMode === "disabled") return null;
  if (displayMode === "auto" && percentage < 25) return null;
  if (contextLength === 0) return null;

  const barColor = percentage >= 90
    ? "bg-destructive"
    : percentage >= 70
      ? "bg-yellow-500"
      : "bg-primary";

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
    return tokens.toLocaleString();
  };

  return (
    <div
      className={cn(
        "relative w-full cursor-default overflow-hidden transition-all duration-300 ease-out",
        isHovered ? "h-5" : "h-1",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="meter"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Context window usage: ~${formatTokens(usedTokens)} / ${formatTokens(contextLength)} tokens (~${Math.round(percentage)}%)`}
    >
      {/* Background track */}
      <div className="bg-muted/50 absolute inset-0" />

      {/* Filled bar */}
      <div
        className={cn(
          barColor,
          "absolute inset-y-0 left-0 transition-all duration-500 ease-out",
          isHovered ? "opacity-80" : "opacity-60",
        )}
        style={{ width: `${percentage}%` }}
      />

      {/* Label (visible on hover) */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="text-foreground text-[10px] font-medium leading-none drop-shadow-sm">
          ~
          {formatTokens(usedTokens)}
          {" / "}
          {formatTokens(contextLength)}
          {" · ~"}
          {Math.round(percentage)}
          %
        </span>
      </div>
    </div>
  );
}
