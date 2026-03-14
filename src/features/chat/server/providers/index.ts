import { and, eq } from "drizzle-orm";

import type { ApiKeyProvider } from "~/lib/api-keys/types";

import { db } from "~/lib/db";
import { modelProviderAvailability } from "~/lib/db/schema/models";

import type { ProviderType, ResolvedProvider } from "./types";

/**
 * Maps a base provider name (from model ID prefix) to the corresponding
 * API key provider and provider type, if direct routing is supported.
 */
const DIRECT_PROVIDER_MAP: Record<string, { keyProvider: ApiKeyProvider; providerType: ProviderType }> = {
  openai: { keyProvider: "openai", providerType: "openai" },
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

export { buildOpenAIProviderOptions, createOpenAIProvider } from "./openai";
export { buildOpenRouterProviderOptions, createOpenRouterProvider } from "./openrouter";
export type { ProviderType, ResolvedProvider } from "./types";
