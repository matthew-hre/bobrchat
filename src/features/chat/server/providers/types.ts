export type ProviderType = "openrouter" | "openai" | "anthropic";

export type ResolvedProvider = {
  providerType: ProviderType;
  providerModelId: string;
  apiKey: string;
};

/**
 * Cheap, fast models used for utility tasks (title generation, icon
 * classification, handoff summarization). One entry per provider type.
 */
export const UTILITY_MODELS: Record<ProviderType, string> = {
  openrouter: "google/gemini-3.1-flash-lite-preview",
  openai: "gpt-5-nano",
  anthropic: "claude-haiku-4-5-20251001",
};

/**
 * Shortlist of cheap/fast models users can pick for each tool type.
 * Each entry maps `providerType:modelId` so the UI can display them
 * and the server can resolve the right provider.
 */
export type ToolModelOption = {
  id: string;
  label: string;
  /** Which providers can serve this model. "openai" models are also available via OpenRouter. */
  providers: ProviderType[];
  /** Model ID when routing directly to OpenAI. */
  openaiModelId?: string;
  /** Model ID when routing directly to Anthropic. */
  anthropicModelId?: string;
  /** Model ID when routing via OpenRouter. */
  openrouterModelId: string;
};

export const TOOL_MODEL_OPTIONS: ToolModelOption[] = [
  { id: "gemini-flash-lite", label: "Gemini Flash Lite", providers: ["openrouter"], openrouterModelId: "google/gemini-3.1-flash-lite-preview" },
  { id: "claude-haiku", label: "Claude Haiku 4.5", providers: ["anthropic", "openrouter"], anthropicModelId: "claude-haiku-4-5-20251001", openrouterModelId: "anthropic/claude-haiku-4.5" },
  { id: "claude-3-haiku", label: "Claude 3 Haiku", providers: ["anthropic", "openrouter"], anthropicModelId: "claude-3-haiku-20240307", openrouterModelId: "anthropic/claude-3-haiku" },
  { id: "gpt-5-nano", label: "GPT-5 Nano", providers: ["openai", "openrouter"], openaiModelId: "gpt-5-nano", openrouterModelId: "openai/gpt-5-nano" },
  { id: "gpt-5-mini", label: "GPT-5 Mini", providers: ["openai", "openrouter"], openaiModelId: "gpt-5-mini", openrouterModelId: "openai/gpt-5-mini" },
];
