import type { ProviderOptions } from "@ai-sdk/provider-utils";

import { createOpenAI } from "@ai-sdk/openai";

/**
 * Creates a Synthetic AI SDK provider instance.
 *
 * Synthetic exposes an OpenAI-compatible API at https://api.synthetic.new/v1/,
 * so we reuse the OpenAI provider with a custom base URL.
 */
export function createSyntheticProvider(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: "https://api.synthetic.new/v1/",
    name: "synthetic",
  });
}

/**
 * Builds Synthetic-specific `providerOptions` for `streamText`.
 *
 * Synthetic is OpenAI-compatible so no special provider options are needed.
 */
export function buildSyntheticProviderOptions(_options: {
  reasoningLevel?: string;
}): ProviderOptions {
  return {};
}
