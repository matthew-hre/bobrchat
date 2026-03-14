import type { ProviderOptions } from "@ai-sdk/provider-utils";

import { createOpenAI } from "@ai-sdk/openai";

import type { ReasoningLevel } from "../service";

/**
 * Creates an OpenAI AI SDK provider instance.
 */
export function createOpenAIProvider(apiKey: string) {
  return createOpenAI({ apiKey });
}

/**
 * Builds OpenAI-specific `providerOptions` for `streamText`.
 *
 * OpenAI includes usage by default — no explicit option needed.
 * OpenAI handles PDFs natively — no plugin needed.
 */
export function buildOpenAIProviderOptions(options: {
  reasoningLevel?: string;
}): ProviderOptions {
  const reasoning = getReasoningConfig(options.reasoningLevel);
  if (!reasoning) {
    return {};
  }
  return { openai: reasoning };
}

function getReasoningConfig(reasoningLevel?: string) {
  if (!reasoningLevel || reasoningLevel === "none") {
    return undefined;
  }
  return {
    reasoningEffort: reasoningLevel as ReasoningLevel,
  };
}
