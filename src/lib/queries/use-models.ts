"use client";

import type { Model } from "@openrouter/sdk/models";

import { useQuery } from "@tanstack/react-query";

import { fetchOpenRouterModels } from "~/server/actions/settings";

import { useUserSettings } from "./use-user-settings";

export const MODELS_KEY = ["models"] as const;

export function useModels(options: { enabled?: boolean } = {}) {
  const { data: settings } = useUserSettings({ enabled: options.enabled });

  const hasApiKey
    = settings?.apiKeyStorage?.openrouter === "client"
      || settings?.apiKeyStorage?.openrouter === "server";

  return useQuery({
    queryKey: MODELS_KEY,
    queryFn: async () => {
      let apiKey: string | undefined;
      if (settings?.apiKeyStorage?.openrouter === "client") {
        apiKey = localStorage.getItem("openrouter_api_key") ?? undefined;
      }
      return fetchOpenRouterModels(apiKey);
    },
    enabled: hasApiKey && options.enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
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
    .map(modelId => allModels.find((m: Model) => m.id === modelId))
    .filter((m): m is Model => m !== undefined);
}
