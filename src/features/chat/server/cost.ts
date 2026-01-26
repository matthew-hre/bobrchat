import { getModelData } from "tokenlens";

type TokenCosts = { inputCostPerMillion: number; outputCostPerMillion: number };

const tokenCostsCache = new Map<string, { data: TokenCosts; expires: number }>();
const TOKEN_COSTS_TTL = 1000 * 60 * 60;

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
 * @param inputCostPerMillion The cost per million input tokens.
 * @param outputCostPerMillion The cost per million output tokens.
 * @param searchPricing Optional search pricing to add (default: 0).
 * @returns The total cost in USD.
 */
export function calculateChatCost(
  usage: { inputTokens: number; outputTokens: number },
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  searchPricing: number = 0,
) {
  return (usage.inputTokens * inputCostPerMillion + usage.outputTokens * outputCostPerMillion) / 1_000_000 + searchPricing;
}

/**
 * Gets token costs for a given model from OpenRouter via tokenlens.
 *
 * Handles errors gracefully by returning 0 costs.
 *
 * @param modelId The ID of the model to get pricing for.
 * @returns An object containing input and output cost per million tokens.
 */
export async function getTokenCosts(modelId: string): Promise<TokenCosts> {
  const cached = tokenCostsCache.get(modelId);
  if (cached && cached.expires > Date.now())
    return cached.data;

  try {
    const [baseModelId, modelSuffix] = modelId.split(":");

    if (modelSuffix === "free") {
      const freeCosts = { inputCostPerMillion: 0, outputCostPerMillion: 0 };
      tokenCostsCache.set(modelId, { data: freeCosts, expires: Date.now() + TOKEN_COSTS_TTL });
      return freeCosts;
    }

    const modelData = await getModelData({ modelId: baseModelId, provider: "openrouter" });

    const costs = {
      inputCostPerMillion: modelData?.cost?.input ?? 0,
      outputCostPerMillion: modelData?.cost?.output ?? 0,
    };
    tokenCostsCache.set(modelId, { data: costs, expires: Date.now() + TOKEN_COSTS_TTL });
    return costs;
  }
  catch (error) {
    console.error(`Failed to get pricing for model ${modelId}:`, error);
    return { inputCostPerMillion: 0, outputCostPerMillion: 0 };
  }
}
