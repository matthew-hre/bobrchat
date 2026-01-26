import type { ExtractToolUIPart, ReasoningUIPart, SearchToolUIPart, TextUIPart } from "~/features/chat/types";

import { isExtractError, isSearchError } from "~/features/chat/server/search/index";
import {
  isSearchToolPart,
  isTextPart,
  isToolComplete,
  isToolError,
} from "~/features/chat/types";

export type NormalizedSource = {
  id: string;
  sourceType: "url";
  url: string;
  title: string;
};

export type NormalizedSearchResult = {
  sources: NormalizedSource[];
  error?: string;
  complete: boolean;
};

/**
 * Normalizes reasoning text by stripping [REDACTED] markers and cleaning up newlines.
 * Returns null if the cleaned text is empty.
 */
export function normalizeReasoningText(text: string | undefined): string | null {
  if (!text)
    return null;

  const cleaned = text
    .replace(/\n\s*\[REDACTED\]/g, "") // Remove newlines before [REDACTED]
    .replace(/\[REDACTED\]/g, "") // Remove any remaining [REDACTED]
    .replace(/\\n/g, "\n") // Unescape literal \n to actual newlines
    .replace(/\n\s*\n/g, "\n") // Collapse multiple newlines to single
    .trim();

  return cleaned || null;
}

/**
 * Normalizes a search tool part, extracting sources and errors with stable IDs.
 * Uses URL as the stable key.
 */
export function normalizeSearchToolPart(part: SearchToolUIPart): NormalizedSearchResult {
  const complete = isToolComplete(part.state);
  let sources: NormalizedSource[] = [];
  let error: string | undefined;

  if (isToolError(part.state)) {
    error = part.errorText || "Search failed";
  }
  else if (part.output && isSearchError(part.output)) {
    error = part.output.message;
  }
  else if (part.output && !isSearchError(part.output)) {
    sources = (part.output.sources ?? []).map(s => ({
      id: s.url,
      sourceType: "url" as const,
      url: s.url,
      title: s.title,
    }));
  }

  return { sources, error, complete };
}

/**
 * Normalizes an extract tool part, extracting sources and errors with stable IDs.
 * Uses URL as the stable key.
 */
export function normalizeExtractToolPart(part: ExtractToolUIPart): NormalizedSearchResult {
  const complete = isToolComplete(part.state);
  let sources: NormalizedSource[] = [];
  let error: string | undefined;

  if (isToolError(part.state)) {
    error = part.errorText || "Extraction failed";
  }
  else if (part.output && isExtractError(part.output)) {
    error = part.output.message;
  }
  else if (part.output && !isExtractError(part.output)) {
    sources = (part.output.sources ?? []).map(s => ({
      id: s.url,
      sourceType: "url" as const,
      url: s.url,
      title: s.title ?? s.url,
    }));
  }

  return { sources, error, complete };
}

/**
 * Extracts text content from message parts.
 */
export function extractMessageText(parts: Array<{ type: string } & Record<string, unknown>>): string {
  return parts
    .filter(part => isTextPart(part))
    .map(part => (part as TextUIPart).text)
    .join("");
}

/**
 * Type guard for checking if a part has reasoning content.
 */
export function hasReasoningContent(part: ReasoningUIPart): boolean {
  return normalizeReasoningText(part.text) !== null;
}

/**
 * Type guard for checking if a search part has displayable content.
 */
export function hasSearchContent(part: { type: string }): boolean {
  if (!isSearchToolPart(part))
    return false;
  const result = normalizeSearchToolPart(part as SearchToolUIPart);
  return result.sources.length > 0 || !!result.error;
}
