/**
 * Supported API key providers.
 */
export type ApiKeyProvider = "openrouter" | "parallel";

/**
 * Where an API key is stored.
 * - "client": stored in browser localStorage
 * - "server": stored encrypted on the server
 */
export type ApiKeyStorageLocation = "client" | "server";
