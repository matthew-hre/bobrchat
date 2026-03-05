import type { ApiKeyProvider } from "~/lib/api-keys/types";

import { useChatUIStore } from "~/features/chat/store";
import { API_KEY_PROVIDER_SLUGS } from "~/lib/api-keys/types";

import { useUserSettings } from "./use-user-settings";

export function useApiKeyStatus(provider: ApiKeyProvider) {
  const { data: settings, isPending } = useUserSettings({ enabled: true });
  const clientKey = useChatUIStore(s => s.clientKeys[provider]);

  const hasClientKey = !!clientKey;
  const hasServerKey = settings?.configuredApiKeys?.[provider] ?? false;

  return {
    hasKey: hasClientKey || hasServerKey,
    source: hasClientKey ? "client" as const : hasServerKey ? "server" as const : null,
    isLoading: isPending,
    clientKey,
  };
}

/**
 * Check if the user has any API key configured across all providers.
 * Also returns the list of DB provider slugs the user has access to,
 * or undefined if they have access to all (via OpenRouter).
 */
export function useHasAnyApiKey() {
  const { data: settings, isPending } = useUserSettings({ enabled: true });
  const clientKeys = useChatUIStore(s => s.clientKeys);

  const configuredProviders = (Object.keys(API_KEY_PROVIDER_SLUGS) as ApiKeyProvider[])
    .filter(p => !!clientKeys[p] || (settings?.configuredApiKeys?.[p] ?? false));

  const hasKey = configuredProviders.length > 0;

  // If any configured provider grants access to all models (null slugs), don't filter
  const hasUniversalAccess = configuredProviders.some(p => API_KEY_PROVIDER_SLUGS[p] === null);

  // Collect unique DB provider slugs the user can access
  const accessibleProviders = hasUniversalAccess
    ? undefined
    : [...new Set(configuredProviders.flatMap(p => API_KEY_PROVIDER_SLUGS[p] ?? []))];

  return {
    hasKey,
    isLoading: isPending,
    /** DB provider slugs to filter models by, or undefined for "show all" */
    accessibleProviders,
  };
}
