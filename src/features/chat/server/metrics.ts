import { calculateChatCost, calculateOcrCost, calculateSearchCost } from "./cost";

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
    searchEnabled,
    sources,
    ocrPageCount,
  } = options;

  // Use actual number of discovered sources (if any) to estimate search cost.
  // `sources` is populated via stream handlers when tool results or source
  // events are emitted.
  //
  // If search isn't enabled, cost is zero.
  // If search is enabled but no sources are found, assume a default of 10 results.
  const resultCount = sources ? sources.length : 0;
  const searchCost = searchEnabled ? calculateSearchCost(resultCount) : 0;

  const ocrCost = ocrPageCount ? calculateOcrCost(ocrPageCount) : 0;

  const modelCost = calculateChatCost(
    { inputTokens, outputTokens },
    inputCostPerMillion,
    outputCostPerMillion,
  );

  const totalCost = modelCost + searchCost + ocrCost;

  return {
    inputTokens,
    outputTokens,
    costUSD: {
      model: modelCost,
      search: searchCost,
      ocr: ocrCost,
      total: totalCost,
    },
    model: modelId,
    tokensPerSecond: outputTokens > 0 ? outputTokens / (totalTime / 1000) : 0,
    timeToFirstTokenMs: firstTokenTime ? firstTokenTime - startTime : 0,
    ...(sources && sources.length > 0 && { sources }),
  };
}
