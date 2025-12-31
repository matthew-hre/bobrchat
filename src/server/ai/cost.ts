import { getModelData } from "tokenlens";

/**
 * Gets an estimated cost pricing for a given model via tokenlens.
 *
 * @param modelId The ID of the model to get pricing for.
 * @returns An object containing input and output cost per million tokens.
 */
export async function getCostPricing(modelId: string) {
  const modelData = await getModelData({ modelId, provider: "openrouter" });
  return {
    inputCostPerMillion: modelData?.cost?.input ?? 0,
    outputCostPerMillion: modelData?.cost?.output ?? 0,
  };
}

/**
 * Calculates the cost of a chat interaction based on token usage and pricing.
 * @param usage An object containing token usage information.
 * @param usage.inputTokens The number of input tokens used.
 * @param usage.outputTokens The number of output tokens used.
 * @param inputCostPerMillion The cost per million input tokens.
 * @param outputCostPerMillion The cost per million output tokens.
 * @returns The total cost in USD.
 */
export function calculateChatCost(
  usage: { inputTokens: number; outputTokens: number },
  inputCostPerMillion: number,
  outputCostPerMillion: number,
) {
  return (usage.inputTokens * inputCostPerMillion + usage.outputTokens * outputCostPerMillion) / 1_000_000;
}
