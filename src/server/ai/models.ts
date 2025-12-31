import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Returns a model provider function for OpenRouter using the provided API key.
 * @param apiKey The OpenRouter API key.
 * @returns A function that takes a model ID and returns the corresponding model configuration.
 */
export function getModelProvider(apiKey: string) {
  return createOpenRouter({ apiKey });
}
