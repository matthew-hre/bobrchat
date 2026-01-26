import type { ExtractToolCall, SearchToolCall } from "./cost";

import { calculateChatCost, calculateExtractCost, calculateOcrCost, calculateSearchCost } from "./cost";

type MetadataOptions = {
  inputTokens: number;
  outputTokens: number;
  totalTime: number;
  firstTokenTime: number | null;
  startTime: number;
  modelId: string;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  searchCalls?: SearchToolCall[];
  extractCalls?: ExtractToolCall[];
  ocrPageCount?: number;
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
    searchCalls,
    extractCalls,
    ocrPageCount,
  } = options;

  const searchCost = calculateSearchCost(searchCalls ?? []);
  const extractCost = calculateExtractCost(extractCalls ?? []);
  const ocrCost = ocrPageCount ? calculateOcrCost(ocrPageCount) : 0;

  const modelCost = calculateChatCost(
    { inputTokens, outputTokens },
    inputCostPerMillion,
    outputCostPerMillion,
  );

  const totalCost = modelCost + searchCost + extractCost + ocrCost;

  return {
    inputTokens,
    outputTokens,
    costUSD: {
      model: modelCost,
      search: searchCost,
      extract: extractCost,
      ocr: ocrCost,
      total: totalCost,
    },
    model: modelId,
    tokensPerSecond: outputTokens > 0 ? outputTokens / (totalTime / 1000) : 0,
    timeToFirstTokenMs: firstTokenTime ? firstTokenTime - startTime : 0,
  };
}
