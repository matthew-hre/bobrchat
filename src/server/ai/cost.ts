import { getModelData } from "tokenlens";

/**
 * Calculates the cost of web search via Parallel.
 *
 * Pricing model:
 * - Base: $0.005 per request
 * - Per result/excerpt: $0.001 each
 *
 * @param resultCount Number of search results or excerpts retrieved
 * @returns Cost in USD
 */
export function calculateSearchCost(resultCount: number): number {
  if (resultCount === 0)
    return 0;
  const BASE_COST = 0.005;
  const PER_RESULT_COST = 0.001;
  const cost = BASE_COST + resultCount * PER_RESULT_COST;
  return cost;
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
export async function getTokenCosts(modelId: string) {
  try {
    // Parse model suffix if present (e.g., "openrouter/meta-llama/llama-2-70b:free")
    const [baseModelId, modelSuffix] = modelId.split(":");

    if (modelSuffix === "free") {
      return { inputCostPerMillion: 0, outputCostPerMillion: 0 };
    }

    const modelData = await getModelData({ modelId: baseModelId, provider: "openrouter" });

    return {
      inputCostPerMillion: modelData?.cost?.input ?? 0,
      outputCostPerMillion: modelData?.cost?.output ?? 0,
    };
  }
  catch (error) {
    console.error(`Failed to get pricing for model ${modelId}:`, error);
    return { inputCostPerMillion: 0, outputCostPerMillion: 0 };
  }
}
