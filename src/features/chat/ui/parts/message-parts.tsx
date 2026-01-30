/* eslint-disable react/no-array-index-key */
"use client";

import type { ExtractToolUIPart, HandoffToolUIPart, ReasoningUIPart, SearchToolUIPart } from "~/features/chat/types";

import { MemoizedMarkdown } from "~/features/chat/components/messages/markdown";
import { ExtractingSources } from "~/features/chat/components/ui/extracting-sources";
import { HandingOff } from "~/features/chat/components/ui/handing-off";
import { ReasoningContent } from "~/features/chat/components/ui/reasoning-content";
import { SearchingSources } from "~/features/chat/components/ui/searching-sources";
import {
  isContentComplete,
  isExtractToolPart,
  isHandoffToolPart,
  isReasoningPart,
  isSearchToolPart,
  isTextPart,
  isToolSearching,
} from "~/features/chat/types";
import { cn } from "~/lib/utils";

import { normalizeExtractToolPart, normalizeHandoffToolPart, normalizeReasoningText, normalizeSearchToolPart } from "./normalize";

export type RenderState = {
  isLast: boolean;
  showRaw: boolean;
  isStopped: boolean;
  searchEnabled: boolean;
  isLoading: boolean;
};

export type MessagePartsProps = {
  messageId: string;
  parts: Array<{ type: string } & Record<string, unknown>>;
  mode: "active" | "shared";
  renderState?: RenderState;
};

/**
 * Shared component for rendering message parts (reasoning, text, search).
 * - "active" mode: handles loading/stopped states for live chat
 * - "shared" mode: read-only display without loading states
 */
export function MessageParts({
  messageId,
  parts,
  mode,
  renderState,
}: MessagePartsProps) {
  const isActive = mode === "active";
  const { isLast = false, showRaw = false, isStopped = false, searchEnabled = false, isLoading = false } = renderState ?? {};

  return (
    <>
      {parts.map((part, index) => {
        if (isReasoningPart(part)) {
          const reasoningPart = part as ReasoningUIPart;
          const cleanedText = normalizeReasoningText(reasoningPart.text);

          if (!cleanedText) {
            return null;
          }

          const isComplete = isContentComplete(reasoningPart.state);
          const isThinking = !isComplete;

          // Only show active thinking if we're in active mode and currently loading
          const isActivelyThinking = isActive && isThinking && isLoading && isLast;
          // Only mark as stopped if the message was stopped AND reasoning wasn't complete
          const reasoningStopped = isActive && isStopped && !isComplete;

          return (
            <ReasoningContent
              key={`part-${index}`}
              id={`${messageId}-reasoning-${index}`}
              content={cleanedText}
              isThinking={isActivelyThinking}
              stopped={reasoningStopped}
            />
          );
        }

        if (isTextPart(part)) {
          if (showRaw) {
            return (
              <pre
                key={`part-${index}`}
                className={`
                  font-mono text-sm wrap-break-word whitespace-pre-wrap
                `}
              >
                {part.text}
              </pre>
            );
          }
          return (
            <MemoizedMarkdown
              key={`part-${index}`}
              id={`${messageId}-${index}`}
              content={part.text}
            />
          );
        }

        if (isSearchToolPart(part)) {
          const searchPart = part as SearchToolUIPart;
          const { sources, error, complete } = normalizeSearchToolPart(searchPart);

          // Determine searching state based on SDK v6 tool states
          const isSearching = isActive && !complete && isToolSearching(searchPart.state) && isLoading && isLast;
          // Only mark as stopped if the message was stopped AND search wasn't complete
          const searchStopped = isActive && isStopped && !complete;

          return (
            <SearchingSources
              key={`part-${index}`}
              id={`${messageId}-search-${index}`}
              sources={sources}
              isSearching={isSearching}
              error={error}
              stopped={searchStopped}
            />
          );
        }

        if (isExtractToolPart(part)) {
          const extractPart = part as ExtractToolUIPart;
          const { sources, error, complete } = normalizeExtractToolPart(extractPart);

          const isExtracting = isActive && !complete && isToolSearching(extractPart.state) && isLoading && isLast;
          const extractStopped = isActive && isStopped && !complete;

          return (
            <ExtractingSources
              key={`part-${index}`}
              id={`${messageId}-extract-${index}`}
              sources={sources}
              isExtracting={isExtracting}
              error={error}
              stopped={extractStopped}
            />
          );
        }

        if (isHandoffToolPart(part)) {
          const handoffPart = part as HandoffToolUIPart;
          const { newThreadId, generatedPrompt, error, complete } = normalizeHandoffToolPart(handoffPart);

          const isHandingOff = isActive && !complete && isToolSearching(handoffPart.state) && isLoading && isLast;
          const handoffStopped = isActive && isStopped && !complete;

          return (
            <HandingOff
              key={`part-${index}`}
              id={`${messageId}-handoff-${index}`}
              isHandingOff={isHandingOff}
              newThreadId={newThreadId}
              generatedPrompt={generatedPrompt}
              error={error}
              stopped={handoffStopped}
              isActiveSession={isActive && isLast}
            />
          );
        }

        return null;
      })}

      {/* Fallback for initial searching state before any parts exist (active mode only) */}
      {isActive && isLoading && isLast && searchEnabled && parts.length === 0 && (
        <SearchingSources id={`${messageId}-search-fallback`} sources={[]} isSearching={true} />
      )}
    </>
  );
}

/**
 * Wrapper that applies raw mode styling.
 */
export function MessagePartsContainer({
  children,
  showRaw,
}: {
  children: React.ReactNode;
  showRaw: boolean;
}) {
  return (
    <div
      className={cn(
        showRaw && `
          border-muted-foreground/30 rounded-md border-2 border-dashed p-4
        `,
      )}
    >
      {children}
    </div>
  );
}
