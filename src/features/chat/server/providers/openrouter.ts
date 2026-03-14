import type { ProviderOptions } from "@ai-sdk/provider-utils";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import type { PdfEngineConfig, ReasoningLevel } from "../service";

/**
 * Creates an OpenRouter AI SDK provider instance.
 */
export function createOpenRouterProvider(apiKey: string) {
  return createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": "https://bobrchat.com",
      "X-Title": "BobrChat",
    },
  });
}

/**
 * Builds OpenRouter-specific `providerOptions` for `streamText`.
 */
export function buildOpenRouterProviderOptions(options: {
  hasPdf: boolean;
  pdfEngineConfig?: PdfEngineConfig;
  reasoningLevel?: string;
}): ProviderOptions {
  return {
    openrouter: {
      usage: { include: true },
      ...getPdfPluginConfig(options.hasPdf, options.pdfEngineConfig),
      ...getReasoningConfig(options.reasoningLevel),
    },
  };
}

function getPdfPluginConfig(hasPdf: boolean, pdfEngineConfig?: PdfEngineConfig) {
  if (!hasPdf || pdfEngineConfig?.supportsNativePdf) {
    return undefined;
  }

  const engine = pdfEngineConfig?.useOcrForPdfs ? "mistral-ocr" : "pdf-text";
  return {
    plugins: [{
      id: "file-parser" as const,
      pdf: { engine: engine as "pdf-text" | "mistral-ocr" },
    }],
  };
}

function getReasoningConfig(reasoningLevel?: string) {
  if (!reasoningLevel || reasoningLevel === "none") {
    return undefined;
  }
  return {
    reasoning: {
      effort: reasoningLevel as ReasoningLevel,
    },
  };
}
