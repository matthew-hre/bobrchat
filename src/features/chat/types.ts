/**
 * UI Message Part Types aligned with Vercel AI SDK v6
 * @see https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message
 */

// SDK v6 tool states
export type ToolState
  = | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";

// SDK v6 reasoning/text states
export type ContentState = "streaming" | "done";

// SDK v6 TextUIPart
export type TextUIPart = {
  type: "text";
  text: string;
  state?: ContentState;
};

// SDK v6 ReasoningUIPart
export type ReasoningUIPart = {
  type: "reasoning";
  text: string;
  state?: ContentState;
  providerMetadata?: Record<string, unknown>;
};

// SDK v6 ToolUIPart - uses `tool-${toolName}` pattern
// The search tool specifically is `tool-search`
export type SearchToolUIPart = {
  type: "tool-search";
  toolCallId: string;
  input?: { query: string };
  output?: {
    results?: Array<{ url: string; title: string }>;
    error?: boolean;
    message?: string;
  };
  errorText?: string;
  state: ToolState;
};

// Generic tool part for other tools
export type GenericToolUIPart = {
  type: `tool-${string}`;
  toolCallId: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  state: ToolState;
};

// Union of all tool parts
export type ToolUIPart = SearchToolUIPart | GenericToolUIPart;

// File part
export type FileUIPart = {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
};

// Source parts
export type SourceUrlUIPart = {
  type: "source-url";
  sourceId: string;
  url: string;
  title?: string;
};

// Step boundary
export type StepStartUIPart = {
  type: "step-start";
};

// Union of all UI message parts
export type UIMessagePart
  = | TextUIPart
    | ReasoningUIPart
    | ToolUIPart
    | FileUIPart
    | SourceUrlUIPart
    | StepStartUIPart;

// ============================================
// Server-side stream types (TextStreamPart)
// ============================================

// SDK v6 tool-result stream part
export type ToolResultStreamPart = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output: unknown;
};

// Type guard for tool-result stream parts
export function isToolResultPart(part: { type: string }): part is ToolResultStreamPart {
  return part.type === "tool-result";
}

// Search result structure from Parallel API
export type SearchToolResult = {
  results?: Array<{ url: string; title: string }>;
  error?: boolean;
  message?: string;
};

// Type guards

export function isTextPart(part: { type: string }): part is TextUIPart {
  return part.type === "text";
}

export function isReasoningPart(part: { type: string }): part is ReasoningUIPart {
  return part.type === "reasoning";
}

export function isToolPart(part: { type: string }): part is ToolUIPart {
  return part.type.startsWith("tool-");
}

export function isSearchToolPart(part: { type: string }): part is SearchToolUIPart {
  return part.type === "tool-search";
}

export function isFilePart(part: { type: string }): part is FileUIPart {
  return part.type === "file";
}

// Tool state helpers

export function isToolComplete(state: ToolState): boolean {
  return state === "output-available" || state === "output-error";
}

export function isToolSearching(state: ToolState): boolean {
  return state === "input-streaming" || state === "input-available";
}

export function isToolError(state: ToolState): boolean {
  return state === "output-error";
}

// Content state helpers

export function isContentComplete(state?: ContentState): boolean {
  return state === "done";
}

export function isContentStreaming(state?: ContentState): boolean {
  return state === "streaming";
}
