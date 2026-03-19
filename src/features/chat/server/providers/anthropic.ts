import type { ProviderOptions } from "@ai-sdk/provider-utils";

import { createAnthropic } from "@ai-sdk/anthropic";

import type { ReasoningLevel } from "../service";

/**
 * Creates an Anthropic AI SDK provider instance.
 */
export function createAnthropicProvider(apiKey: string) {
  return createAnthropic({ apiKey });
}

/**
 * Builds Anthropic-specific `providerOptions` for `streamText`.
 *
 * Anthropic uses `thinking` with a token budget instead of a reasoning effort string.
 */
export function buildAnthropicProviderOptions(options: {
  reasoningLevel?: string;
}): ProviderOptions {
  const thinking = getThinkingConfig(options.reasoningLevel);
  if (!thinking) {
    return {};
  }
  return { anthropic: thinking };
}

const REASONING_BUDGET: Record<string, number> = {
  minimal: 1024,
  low: 4096,
  medium: 10000,
  high: 32000,
  xhigh: 64000,
};

function getThinkingConfig(reasoningLevel?: string) {
  if (!reasoningLevel || reasoningLevel === "none") {
    return undefined;
  }
  const budgetTokens = REASONING_BUDGET[reasoningLevel as ReasoningLevel];
  if (!budgetTokens) {
    return undefined;
  }
  return {
    thinking: { type: "enabled" as const, budgetTokens },
  };
}
