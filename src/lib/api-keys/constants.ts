import type { ApiKeyProvider } from "./types";

/**
 * localStorage keys for client-side API key storage.
 * Kept for backwards compatibility with existing user data.
 */
export const CLIENT_STORAGE_KEYS: Record<ApiKeyProvider, string> = {
  openrouter: "openrouter_api_key",
  parallel: "parallel_api_key",
};
