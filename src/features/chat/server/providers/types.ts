export type ProviderType = "openrouter" | "openai";

export type ResolvedProvider = {
  providerType: ProviderType;
  providerModelId: string;
  apiKey: string;
};
