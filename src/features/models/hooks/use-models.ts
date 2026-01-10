"use client";

import type { Model } from "@openrouter/sdk/models";

import { useQuery } from "@tanstack/react-query";

import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { getClientKey } from "~/lib/api-keys/client";

import { fetchOpenRouterModels } from "../actions";

export const MODELS_KEY = ["models"] as const;

export function useModels(options: { enabled?: boolean } = {}) {
  const { data: settings } = useUserSettings({ enabled: options.enabled });

  const hasApiKey
    = settings?.apiKeyStorage?.openrouter === "client"
      || settings?.apiKeyStorage?.openrouter === "server";

  return useQuery({
    queryKey: MODELS_KEY,
    queryFn: async () => {
      const clientKey = settings?.apiKeyStorage?.openrouter === "client"
        ? getClientKey("openrouter") ?? undefined
        : undefined;
      return fetchOpenRouterModels(clientKey);
    },
    enabled: hasApiKey && options.enabled,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useFavoriteModels(): Model[] {
  const { data: allModels } = useModels();
  const { data: settings } = useUserSettings();

  if (!allModels || !settings?.favoriteModels) {
    return [];
  }

  return settings.favoriteModels
    .map((modelId: string) => allModels.find((m: Model) => m.id === modelId))
    .filter((m: Model | undefined): m is Model => m !== undefined);
}
