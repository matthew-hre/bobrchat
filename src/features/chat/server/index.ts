// Error handling
export { formatProviderError } from "./error";

// Handler
export { handleChatRequest } from "./handler";

// Metrics
export {
  calculateChatCost,
  calculateExtractCost,
  calculateOcrCost,
  calculateResponseMetadata,
  calculateSearchCost,
} from "./metrics";
export type { ExtractToolCall, SearchToolCall } from "./metrics";

// Models
export { getModelProvider } from "./models";

// Prompt
export { generatePrompt } from "./prompt";

// Service
export { streamChatResponse } from "./service";
export type { PdfEngineConfig, ReasoningLevel } from "./service";

// Stream
export {
  createStreamHandlers,
  getPdfPluginConfig,
  getReasoningConfig,
  processStreamChunk,
} from "./stream";

// Thread
export { generateThreadIcon, generateThreadTitle } from "./thread";

// Tools
export {
  createHandoffThread,
  createHandoffTool,
  createSearchTools,
  generateHandoffPrompt,
  isExtractError,
  isHandoffError,
  isSearchError,
} from "./tools";
export type {
  ExtractErrorOutput,
  ExtractOutput,
  ExtractSource,
  ExtractToolOutput,
  HandoffErrorOutput,
  HandoffInput,
  HandoffOutput,
  HandoffToolOutput,
  HandoffTools,
  HandoffUITools,
  SearchErrorOutput,
  SearchOutput,
  SearchSource,
  SearchToolOutput,
  SearchTools,
  SearchUITools,
} from "./tools";

// Uploads
export {
  getTotalPdfPageCount,
  hasPdfAttachment,
  processMessageFiles,
} from "./uploads";
