import type { ApiKeyProvider } from "./types";

import { CLIENT_STORAGE_KEYS } from "./constants";

/**
 * Get an API key from browser localStorage.
 *
 * @param provider The API key provider
 * @returns The API key or null if not found
 */
export function getClientKey(provider: ApiKeyProvider): string | null {
  if (typeof window === "undefined")
    return null;
  return localStorage.getItem(CLIENT_STORAGE_KEYS[provider]);
}

/**
 * Set an API key in browser localStorage.
 *
 * @param provider The API key provider
 * @param key The API key to store
 */
export function setClientKey(provider: ApiKeyProvider, key: string): void {
  if (typeof window === "undefined")
    return;
  localStorage.setItem(CLIENT_STORAGE_KEYS[provider], key);
}

/**
 * Remove an API key from browser localStorage.
 *
 * @param provider The API key provider
 */
export function removeClientKey(provider: ApiKeyProvider): void {
  if (typeof window === "undefined")
    return;
  localStorage.removeItem(CLIENT_STORAGE_KEYS[provider]);
}

/**
 * Check if an API key exists in browser localStorage.
 *
 * @param provider The API key provider
 * @returns True if the key exists
 */
export function hasClientKey(provider: ApiKeyProvider): boolean {
  if (typeof window === "undefined")
    return false;
  return localStorage.getItem(CLIENT_STORAGE_KEYS[provider]) !== null;
}
