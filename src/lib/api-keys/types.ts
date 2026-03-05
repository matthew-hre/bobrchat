/**
 * Supported API key providers.
 */
export type ApiKeyProvider = "openrouter" | "openai" | "parallel";

/**
 * localStorage keys for client-side API key storage.
 * Kept for backwards compatibility with existing user data.
 */
export const CLIENT_STORAGE_KEYS: Record<ApiKeyProvider, string> = {
  openrouter: "openrouter_api_key",
  openai: "openai_api_key",
  parallel: "parallel_api_key",
};

/**
 * Maps an ApiKeyProvider to the DB model provider slugs it grants access to.
 * - "openrouter" is a universal gateway → null means "all providers"
 * - "openai" grants access to models with provider "openai"
 * - "parallel" is not a model provider (tools-only) → empty array
 *
 * To add a new direct provider (e.g. Anthropic), add an entry here and to ApiKeyProvider.
 */
export const API_KEY_PROVIDER_SLUGS: Record<ApiKeyProvider, string[] | null> = {
  openrouter: null,
  openai: ["openai"],
  parallel: [],
};
