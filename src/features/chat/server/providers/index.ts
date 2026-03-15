import { and, eq } from "drizzle-orm";

import type { ToolModelId } from "~/features/settings/types";
import type { ApiKeyProvider } from "~/lib/api-keys/types";

import { db } from "~/lib/db";
import { modelProviderAvailability } from "~/lib/db/schema/models";

import type { ProviderType, ResolvedProvider } from "./types";

import { TOOL_MODEL_OPTIONS, UTILITY_MODELS } from "./types";

/**
 * Maps a base provider name (from model ID prefix) to the corresponding
 * API key provider and provider type, if direct routing is supported.
 */
const DIRECT_PROVIDER_MAP: Record<string, { keyProvider: ApiKeyProvider; providerType: ProviderType }> = {
  openai: { keyProvider: "openai", providerType: "openai" },
  anthropic: { keyProvider: "anthropic", providerType: "anthropic" },
};

/**
 * Resolves which provider to use for a given model.
 *
 * Priority:
 * 1. If user has a direct provider key AND the model is available on that
 *    direct provider → route directly (e.g. OpenAI).
 * 2. If user has an OpenRouter key → route via OpenRouter.
 * 3. Neither → throw an error.
 */
export async function resolveProvider(
  modelId: string,
  resolvedKeys: Partial<Record<ApiKeyProvider, string>>,
): Promise<ResolvedProvider> {
  const baseProvider = modelId.split("/")[0];
  const directMapping = DIRECT_PROVIDER_MAP[baseProvider];

  if (directMapping) {
    const directKey = resolvedKeys[directMapping.keyProvider];

    if (directKey) {
      const availability = await db
        .select({ providerModelId: modelProviderAvailability.providerModelId })
        .from(modelProviderAvailability)
        .where(
          and(
            eq(modelProviderAvailability.modelId, modelId),
            eq(modelProviderAvailability.provider, baseProvider),
          ),
        )
        .limit(1);

      if (availability.length > 0) {
        return {
          providerType: directMapping.providerType,
          providerModelId: availability[0].providerModelId,
          apiKey: directKey,
        };
      }
    }
  }

  const openrouterKey = resolvedKeys.openrouter;
  if (openrouterKey) {
    return {
      providerType: "openrouter",
      providerModelId: modelId,
      apiKey: openrouterKey,
    };
  }

  throw new Error("No API key configured. Please set up your OpenRouter or provider API key in settings.");
}

/**
 * Resolves a provider for cheap utility LLM calls (title generation, icon
 * classification, handoff summarisation).
 *
 * Priority: OpenRouter (cheapest) → OpenAI direct → undefined.
 */
export function resolveUtilityProvider(
  resolvedKeys: Partial<Record<ApiKeyProvider, string>>,
): ResolvedProvider | undefined {
  const openrouterKey = resolvedKeys.openrouter;
  if (openrouterKey) {
    return {
      providerType: "openrouter",
      providerModelId: UTILITY_MODELS.openrouter,
      apiKey: openrouterKey,
    };
  }

  const openaiKey = resolvedKeys.openai;
  if (openaiKey) {
    return {
      providerType: "openai",
      providerModelId: UTILITY_MODELS.openai,
      apiKey: openaiKey,
    };
  }

  const anthropicKey = resolvedKeys.anthropic;
  if (anthropicKey) {
    return {
      providerType: "anthropic",
      providerModelId: UTILITY_MODELS.anthropic,
      apiKey: anthropicKey,
    };
  }

  return undefined;
}

/**
 * Resolves a provider for a specific tool based on user's model preference.
 * Falls back to `resolveUtilityProvider` when the chosen model's provider
 * has no key configured.
 */
export function resolveToolProvider(
  toolModelId: ToolModelId | undefined,
  resolvedKeys: Partial<Record<ApiKeyProvider, string>>,
): ResolvedProvider | undefined {
  if (!toolModelId) {
    return resolveUtilityProvider(resolvedKeys);
  }

  const option = TOOL_MODEL_OPTIONS.find(o => o.id === toolModelId);
  if (!option) {
    return resolveUtilityProvider(resolvedKeys);
  }

  // Prefer direct OpenAI when available
  if (option.openaiModelId && resolvedKeys.openai) {
    return { providerType: "openai", providerModelId: option.openaiModelId, apiKey: resolvedKeys.openai };
  }

  // Try direct Anthropic
  if (option.anthropicModelId && resolvedKeys.anthropic) {
    return { providerType: "anthropic", providerModelId: option.anthropicModelId, apiKey: resolvedKeys.anthropic };
  }

  // Fall back to OpenRouter
  if (resolvedKeys.openrouter && option.providers.includes("openrouter")) {
    return { providerType: "openrouter", providerModelId: option.openrouterModelId, apiKey: resolvedKeys.openrouter };
  }

  // No matching key, fall back to cheapest available
  return resolveUtilityProvider(resolvedKeys);
}

export { buildAnthropicProviderOptions, createAnthropicProvider } from "./anthropic";
export { buildOpenAIProviderOptions, createOpenAIProvider } from "./openai";
export { buildOpenRouterProviderOptions, createOpenRouterProvider } from "./openrouter";
export { TOOL_MODEL_OPTIONS, UTILITY_MODELS } from "./types";
export type { ProviderType, ResolvedProvider, ToolModelOption } from "./types";
