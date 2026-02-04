/**
 * Calculates the cost of OCR processing via Mistral OCR.
 *
 * Pricing model: $2 per 1000 pages
 *
 * @param pageCount Number of PDF pages processed
 * @returns Cost in USD
 */
export function calculateOcrCost(pageCount: number): number {
  if (pageCount <= 0)
    return 0;
  const COST_PER_1000_PAGES = 2;
  return (pageCount / 1000) * COST_PER_1000_PAGES;
}

/**
 * Represents a single search tool call with its result count.
 */
export type SearchToolCall = { resultCount: number };

/**
 * Represents a single extract tool call with its URL count.
 */
export type ExtractToolCall = { urlCount: number };

/**
 * Calculates the cost of web search via Parallel.
 *
 * Pricing model (per request):
 * - Base: $0.005 per request (includes up to 10 results)
 * - Additional results beyond 10: $0.001 each
 *
 * @param calls Array of search tool calls with their result counts
 * @returns Cost in USD
 */
export function calculateSearchCost(calls: SearchToolCall[]): number {
  if (calls.length === 0)
    return 0;

  const BASE_COST_PER_REQUEST = 0.005;
  const PER_ADDITIONAL_RESULT_COST = 0.001;
  const INCLUDED_RESULTS = 10;

  return calls.reduce((total, call) => {
    const additionalResults = Math.max(0, call.resultCount - INCLUDED_RESULTS);
    return total + BASE_COST_PER_REQUEST + (additionalResults * PER_ADDITIONAL_RESULT_COST);
  }, 0);
}

/**
 * Calculates the cost of URL extraction via Parallel.
 *
 * Pricing model:
 * - $1 per 1000 URLs extracted ($0.001 per URL)
 *
 * @param calls Array of extract tool calls with their URL counts
 * @returns Cost in USD
 */
export function calculateExtractCost(calls: ExtractToolCall[]): number {
  if (calls.length === 0)
    return 0;

  const COST_PER_URL = 0.001;
  const totalUrls = calls.reduce((sum, call) => sum + call.urlCount, 0);
  return totalUrls * COST_PER_URL;
}

/**
 * Calculates the cost of a chat interaction based on token usage and pricing.
 *
 * @param usage An object containing token usage information.
 * @param usage.inputTokens The number of input tokens used.
 * @param usage.outputTokens The number of output tokens used.
 * @param inputCostPerToken The cost per input token.
 * @param outputCostPerToken The cost per output token.
 * @returns An object containing prompt cost, completion cost, and total cost.
 */
export function calculateChatCost(
  usage: { inputTokens: number; outputTokens: number },
  inputCostPerToken: number,
  outputCostPerToken: number,
) {
  const promptCost = (usage.inputTokens * inputCostPerToken);
  const completionCost = (usage.outputTokens * outputCostPerToken);
  const totalCost = promptCost + completionCost;

  return {
    promptCost,
    completionCost,
    totalCost,
  };
}
