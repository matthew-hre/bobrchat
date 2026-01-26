import type { TextStreamPart, ToolSet } from "ai";

import type { SearchToolOutput } from "~/features/chat/server/search/index";
import type { ToolResultStreamPart } from "~/features/chat/types";
import type { ExtractToolCall, SearchToolCall } from "./cost";

import { isSearchError } from "~/features/chat/server/search/index";
import { isToolResultPart } from "~/features/chat/types";

type Source = { id: string; sourceType: string; url?: string; title?: string };

type StreamChunkHandler = {
  onFirstToken: () => void;
  onSource: (source: Source) => void;
  onSearchCall: (call: SearchToolCall) => void;
  onExtractCall: (call: ExtractToolCall) => void;
};

/**
 * Creates handlers for processing stream chunks.
 *
 * @param onFirstTokenCallback Called when the first token is received
 * @param onSourceCallback Called when a source is found
 * @param onSearchCallCallback Called when a search tool call completes
 * @param onExtractCallCallback Called when an extract tool call completes
 * @returns An object with chunk handlers
 */
export function createStreamHandlers(
  onFirstTokenCallback: () => void,
  onSourceCallback: (source: Source) => void,
  onSearchCallCallback: (call: SearchToolCall) => void,
  onExtractCallCallback: (call: ExtractToolCall) => void,
): StreamChunkHandler {
  return {
    onFirstToken: onFirstTokenCallback,
    onSource: onSourceCallback,
    onSearchCall: onSearchCallCallback,
    onExtractCall: onExtractCallCallback,
  };
}

/**
 * Extracts sources from a search tool result.
 */
function extractSourcesFromToolResult(result: unknown): Source[] {
  if (!result)
    return [];

  const output = result as SearchToolOutput;
  if (isSearchError(output))
    return [];

  return output.sources.map(s => ({
    id: s.url,
    sourceType: "url" as const,
    url: s.url,
    title: s.title,
  }));
}

/**
 * Processes stream chunks and triggers appropriate handlers.
 *
 * @param part The stream chunk to process
 * @param handlers The chunk handlers
 */
export function processStreamChunk(part: TextStreamPart<ToolSet>, handlers: StreamChunkHandler) {
  if (part.type === "text-start") {
    handlers.onFirstToken();
  }
  else if (part.type === "source") {
    handlers.onSource({
      id: part.id,
      sourceType: part.sourceType,
      ...(part.sourceType === "url" && {
        url: part.url,
        title: part.title,
      }),
    });
  }
  else if (isToolResultPart(part)) {
    const toolPart = part as ToolResultStreamPart;
    if (toolPart.toolName === "search") {
      const sources = extractSourcesFromToolResult(toolPart.output);
      sources.forEach(handlers.onSource);
      handlers.onSearchCall({ resultCount: sources.length });
    }
    else if (toolPart.toolName === "extract") {
      const sources = extractSourcesFromToolResult(toolPart.output);
      sources.forEach(handlers.onSource);
      handlers.onExtractCall({ urlCount: sources.length });
    }
  }
}
