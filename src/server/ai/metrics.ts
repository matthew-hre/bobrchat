import { calculateChatCost, calculateSearchCost } from "./cost";

type MetadataOptions = {
  inputTokens: number;
  outputTokens: number;
  totalTime: number;
  firstTokenTime: number | null;
  startTime: number;
  modelId: string;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  searchEnabled?: boolean;
  sources?: Array<{ id: string; sourceType: string; url?: string; title?: string }>;
};

/**
 * Calculates metadata for a completed chat response.
 *
 * @param options Configuration for metadata calculation
 * @returns Metadata object with tokens, costs, timing, and sources
 */
export function calculateResponseMetadata(options: MetadataOptions) {
  const {
    inputTokens,
    outputTokens,
    totalTime,
    firstTokenTime,
    startTime,
    modelId,
    inputCostPerMillion,
    outputCostPerMillion,
    searchEnabled,
    sources,
  } = options;

  // TODO: Calculate actual search result count from tool calls.
  // Currently using the default of 10 results for cost estimation.
  const searchPricing = searchEnabled
    ? calculateSearchCost(10)
    : 0;

  const totalCost = calculateChatCost(
    { inputTokens, outputTokens },
    inputCostPerMillion,
    outputCostPerMillion,
    searchPricing,
  );

  return {
    inputTokens,
    outputTokens,
    costUSD: totalCost,
    model: modelId,
    tokensPerSecond: outputTokens > 0 ? outputTokens / (totalTime / 1000) : 0,
    timeToFirstTokenMs: firstTokenTime ? firstTokenTime - startTime : 0,
    ...(sources && sources.length > 0 && { sources }),
  };
}
