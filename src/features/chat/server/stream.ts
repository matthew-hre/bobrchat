import type { TextStreamPart, ToolSet } from "ai";

import type { SearchToolOutput } from "~/features/chat/server/search/index";
import type { ToolResultStreamPart } from "~/features/chat/types";

import { isSearchError } from "~/features/chat/server/search/index";
import { isToolResultPart } from "~/features/chat/types";

import type { ExtractToolCall, SearchToolCall } from "./cost";

type StreamChunkHandler = {
  onFirstToken: () => void;
  onSearchCall: (call: SearchToolCall) => void;
  onExtractCall: (call: ExtractToolCall) => void;
};

/**
 * Creates handlers for processing stream chunks.
 *
 * @param onFirstTokenCallback Called when the first token is received
 * @param onSearchCallCallback Called when a search tool call completes
 * @param onExtractCallCallback Called when an extract tool call completes
 * @returns An object with chunk handlers
 */
export function createStreamHandlers(
  onFirstTokenCallback: () => void,
  onSearchCallCallback: (call: SearchToolCall) => void,
  onExtractCallCallback: (call: ExtractToolCall) => void,
): StreamChunkHandler {
  return {
    onFirstToken: onFirstTokenCallback,
    onSearchCall: onSearchCallCallback,
    onExtractCall: onExtractCallCallback,
  };
}

/**
 * Counts sources from a search/extract tool result.
 */
function countSourcesFromToolResult(result: unknown): number {
  if (!result)
    return 0;

  const output = result as SearchToolOutput;
  if (isSearchError(output))
    return 0;

  return output.sources.length;
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
  else if (isToolResultPart(part)) {
    const toolPart = part as ToolResultStreamPart;
    if (toolPart.toolName === "search") {
      const resultCount = countSourcesFromToolResult(toolPart.output);
      handlers.onSearchCall({ resultCount });
    }
    else if (toolPart.toolName === "extract") {
      const urlCount = countSourcesFromToolResult(toolPart.output);
      handlers.onExtractCall({ urlCount });
    }
  }
}
