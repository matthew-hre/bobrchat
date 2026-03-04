import type { ApiKeyProvider } from "~/lib/api-keys/types";

import { useChatUIStore } from "~/features/chat/store";

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
