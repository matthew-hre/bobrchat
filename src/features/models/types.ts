import type { Model } from "@openrouter/sdk/models";

export type ModelCapabilities = {
  supportsImages: boolean;
  supportsFiles: boolean;
  supportsPdf: boolean;
  supportsNativePdf: boolean;
  supportsSearch: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;
};

export type FileValidationResult = {
  valid: File[];
  invalid: { file: File; reason: string }[];
};

export type CapabilityFilter = "image" | "pdf" | "search" | "reasoning";

export type SortOrder
  = | "provider-asc"
    | "provider-desc"
    | "model-asc"
    | "model-desc"
    | "cost-asc"
    | "cost-desc";

export type { Model };
