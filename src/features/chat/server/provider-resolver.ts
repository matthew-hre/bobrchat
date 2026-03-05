import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { LanguageModel } from "ai";

import { createOpenAI } from "@ai-sdk/openai";

import type { ApiKeyProvider } from "~/lib/api-keys/types";

import type { PdfEngineConfig, ReasoningLevel } from "./service";

import { getModelProvider } from "./models";
import { getPdfPluginConfig, getReasoningConfig } from "./stream";

export type ProviderType = "openrouter" | "openai";

export type ResolvedProvider = {
  model: LanguageModel;
  providerType: ProviderType;
  providerOptions: ProviderOptions;
};

type ResolveProviderOptions = {
  modelId: string;
  resolvedKeys: Partial<Record<ApiKeyProvider, string>>;
  reasoningLevel?: string;
  hasPdf: boolean;
  pdfEngineConfig?: PdfEngineConfig;
};

/**
 * Extracts the provider prefix from an OpenRouter-style model ID.
 * e.g. "openai/gpt-4o" → "openai", "google/gemini-3" → "google"
 */
function getModelPrefix(modelId: string): string | null {
  const slashIndex = modelId.indexOf("/");
  if (slashIndex === -1)
    return null;
  return modelId.substring(0, slashIndex);
}

/**
 * Strips the provider prefix from a model ID.
 * e.g. "openai/gpt-4o" → "gpt-4o", "openai/o4-mini" → "o4-mini"
 */
function stripModelPrefix(modelId: string): string {
  const slashIndex = modelId.indexOf("/");
  if (slashIndex === -1)
    return modelId;
  return modelId.substring(slashIndex + 1);
}

/**
 * Builds providerOptions for OpenRouter requests.
 */
function buildOpenRouterOptions(
  hasPdf: boolean,
  pdfEngineConfig?: PdfEngineConfig,
  reasoningLevel?: string,
): ProviderOptions {
  return {
    openrouter: {
      usage: { include: true },
      ...getPdfPluginConfig(hasPdf, pdfEngineConfig),
      ...getReasoningConfig(reasoningLevel),
    },
  };
}

/**
 * Builds providerOptions for direct OpenAI requests.
 */
function buildOpenAIOptions(
  reasoningLevel?: string,
): ProviderOptions {
  if (!reasoningLevel || reasoningLevel === "none") {
    return {};
  }
  return {
    openai: {
      reasoningEffort: reasoningLevel as ReasoningLevel,
    },
  };
}

/**
 * Resolves which AI provider SDK and options to use for a given model + available keys.
 *
 * Prefers direct provider keys over OpenRouter when the model matches.
 * Falls back to OpenRouter for all other models or when no direct key is available.
 */
export function resolveProvider({
  modelId,
  resolvedKeys,
  reasoningLevel,
  hasPdf,
  pdfEngineConfig,
}: ResolveProviderOptions): ResolvedProvider {
  const prefix = getModelPrefix(modelId);

  // Direct OpenAI: model starts with "openai/" and user has an OpenAI key
  if (prefix === "openai" && resolvedKeys.openai) {
    const bareModelId = stripModelPrefix(modelId);
    const openai = createOpenAI({ apiKey: resolvedKeys.openai });

    return {
      model: openai.chat(bareModelId),
      providerType: "openai",
      providerOptions: buildOpenAIOptions(reasoningLevel),
    };
  }

  // Fallback: OpenRouter for everything else
  const openrouterKey = resolvedKeys.openrouter;
  if (!openrouterKey) {
    throw new Error("No API key configured. Please set up your OpenRouter API key in settings.");
  }

  const openrouter = getModelProvider(openrouterKey);

  return {
    model: openrouter(modelId),
    providerType: "openrouter",
    providerOptions: buildOpenRouterOptions(hasPdf, pdfEngineConfig, reasoningLevel),
  };
}
