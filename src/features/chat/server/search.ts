import type { ToolSet } from "ai";

// @ts-expect-error - patching @parallel-web/ai-sdk-tools
import { createParallelClient, extractTool, searchTool } from "@parallel-web/ai-sdk-tools";

const SEARCH_ERROR_HINTS: Record<string, string> = {
  401: "Your Parallel API key is invalid. Please check your API key in settings.",
  403: "Your Parallel API key does not have permission for this operation.",
  429: "Search rate limit exceeded. Please try again later.",
};

function formatSearchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Search failed";
  }

  const message = error.message;

  for (const [code, hint] of Object.entries(SEARCH_ERROR_HINTS)) {
    if (message.includes(code)) {
      return hint;
    }
  }

  return message;
}

/**
 * Creates search and extract tools for the AI model.
 *
 * @param parallelApiKey The Parallel Web API key for web search functionality.
 * @returns ToolSet with search and extract tools, or undefined if no key provided.
 */
export function createSearchTools(parallelApiKey?: string): ToolSet | undefined {
  if (!parallelApiKey) {
    return undefined;
  }

  const parallelClient = createParallelClient(parallelApiKey);

  return {
    search: {
      ...searchTool,
      execute: async (args, context) => {
        try {
          const result = await parallelClient.beta.search(
            args,
            {
              signal: context.abortSignal,
              headers: { "parallel-beta": "search-extract-2025-10-10" },
            },
          );
          return result;
        }
        catch (error) {
          const message = formatSearchError(error);
          console.warn("[websearch] search failed:", message);
          return { error: true, message };
        }
      },
    },
    extract: {
      ...extractTool,
      execute: async (args, context) => {
        try {
          const result = await parallelClient.beta.extract(
            args,
            {
              signal: context.abortSignal,
              headers: { "parallel-beta": "search-extract-2025-10-10" },
            },
          );
          return result;
        }
        catch (error) {
          const message = formatSearchError(error);
          console.warn("[websearch] extract failed:", message);
          return { error: true, message };
        }
      },
    },
  };
}
