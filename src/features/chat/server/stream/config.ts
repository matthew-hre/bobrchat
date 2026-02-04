import type { PdfEngineConfig, ReasoningLevel } from "../service";

/**
 * Gets the PDF plugin configuration for OpenRouter.
 *
 * @param hasPdf Whether the messages contain PDF attachments
 * @param pdfEngineConfig Configuration for PDF processing engine selection
 * @returns The plugin configuration or undefined if not needed
 */
export function getPdfPluginConfig(hasPdf: boolean, pdfEngineConfig?: PdfEngineConfig) {
  if (!hasPdf) {
    return undefined;
  }

  if (pdfEngineConfig?.supportsNativePdf) {
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

/**
 * Gets the reasoning configuration for OpenRouter.
 *
 * @param reasoningLevel The reasoning effort level
 * @returns The reasoning configuration or undefined if not needed
 */
export function getReasoningConfig(reasoningLevel?: string) {
  if (!reasoningLevel || reasoningLevel === "none") {
    return undefined;
  }
  return {
    reasoning: {
      effort: reasoningLevel as ReasoningLevel,
    },
  };
}
