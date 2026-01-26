/**
 * Chat types - leveraging Vercel AI SDK v6 exports where possible
 * @see https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message
 *
 * Key SDK patterns used:
 * - `ToolUIPart<TOOLS>`: Typed tool parts with `type: "tool-${NAME}"`
 * - `InferUITools<TOOLS>`: Infers input/output types from a ToolSet
 * - `getToolName(part)`: SDK helper to get tool name from any tool part
 * - `isToolUIPart(part)`: SDK helper to check if a part is a tool part
 */

import type {
  FileUIPart,
  ReasoningUIPart,
  SourceUrlUIPart,
  StepStartUIPart,
  TextStreamPart,
  TextUIPart,
  ToolSet,
  ToolUIPart,
} from "ai";

import type { SearchUITools } from "./server/search/index";

// Re-export SDK types for convenience
export type {
  FileUIPart,
  ReasoningUIPart,
  SourceUrlUIPart,
  StepStartUIPart,
  TextUIPart,
};

// Re-export inferred search tool types for UI type safety
export type { SearchTools, SearchUITools } from "./server/search/index";

// ============================================
// Simple type guards (work with loose part types)
// ============================================

// Note: SDK guards require full UIMessagePart type, but our components often
// use looser types like `{ type: string } & Record<string, unknown>`.
// These simple guards work with any object that has a `type` field.

export function isTextPart(part: { type: string }): part is TextUIPart {
  return part.type === "text";
}

export function isReasoningPart(part: { type: string }): part is ReasoningUIPart {
  return part.type === "reasoning";
}

export function isToolPart(part: { type: string }): part is ToolUIPart<SearchUITools> {
  return part.type.startsWith("tool-");
}

export function isFilePart(part: { type: string }): part is FileUIPart {
  return part.type === "file";
}

// ============================================
// Derived state types from SDK
// ============================================

// Tool states derived from SDK's ToolUIPart
export type ToolState = ToolUIPart["state"];

// Content states derived from SDK's TextUIPart/ReasoningUIPart
export type ContentState = NonNullable<TextUIPart["state"]>;

// ============================================
// App-specific tool types (Search)
// ============================================

// Re-export search types from server for convenience
export type {
  ExtractErrorOutput,
  ExtractOutput,
  ExtractSource,
  ExtractToolOutput,
  SearchErrorOutput,
  SearchOutput,
  SearchSource,
  SearchToolOutput,
} from "./server/search/index";

/**
 * Search tool UI part - extracted from SDK's ToolUIPart<SearchUITools>.
 *
 * The SDK generates typed tool parts as `{ type: "tool-${NAME}", ... }`.
 * For our search tool, this becomes `type: "tool-search"`.
 *
 * This type is compatible with the SDK's ToolUIPart when SearchUITools is used.
 */
export type SearchToolUIPart = Extract<
  ToolUIPart<SearchUITools>,
  { type: "tool-search" }
>;

/**
 * Extract tool UI part - extracted from SDK's ToolUIPart<SearchUITools>.
 *
 * For our extract tool, this becomes `type: "tool-extract"`.
 */
export type ExtractToolUIPart = Extract<
  ToolUIPart<SearchUITools>,
  { type: "tool-extract" }
>;

// ============================================
// Server-side stream types (derived from SDK)
// ============================================

// Tool result stream part derived from SDK's TextStreamPart
export type ToolResultStreamPart = Extract<
  TextStreamPart<ToolSet>,
  { type: "tool-result" }
>;

// Type guard for tool-result stream parts
export function isToolResultPart(
  part: TextStreamPart<ToolSet>,
): part is ToolResultStreamPart {
  return part.type === "tool-result";
}

// ============================================
// App-specific type guards
// ============================================

export function isSearchToolPart(part: { type: string }): part is SearchToolUIPart {
  return part.type === "tool-search";
}

export function isExtractToolPart(part: { type: string }): part is ExtractToolUIPart {
  return part.type === "tool-extract";
}

// ============================================
// Tool state helpers
// ============================================

export function isToolComplete(state: ToolState): boolean {
  return state === "output-available" || state === "output-error" || state === "output-denied";
}

export function isToolSearching(state: ToolState): boolean {
  return state === "input-streaming" || state === "input-available";
}

export function isToolError(state: ToolState): boolean {
  return state === "output-error";
}

// ============================================
// Content state helpers
// ============================================

export function isContentComplete(state?: ContentState): boolean {
  return state === "done";
}

export function isContentStreaming(state?: ContentState): boolean {
  return state === "streaming";
}
