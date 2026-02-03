"use client";

import type { Model } from "@openrouter/sdk/models";

import { useQuery } from "@tanstack/react-query";

import { useApiKeyStatus } from "~/features/settings/hooks/use-api-status";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { MODELS_KEY } from "~/lib/queries/query-keys";

import type { ModelsQueryParams, ModelsQueryResult } from "../types";

import { fetchModels, fetchModelsByIds } from "../actions";

export { MODELS_KEY };

/**
 * Fetch models with filtering, sorting, and pagination
 */
export function useModelsQuery(
  params: ModelsQueryParams,
  options: { enabled?: boolean } = {},
) {
  const { hasKey } = useApiKeyStatus("openrouter");

  return useQuery<ModelsQueryResult>({
    queryKey: [...MODELS_KEY, params],
    queryFn: () => fetchModels(params),
    enabled: hasKey && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Get favorite models by fetching only the needed IDs
 * More efficient than loading all models
 */
export function useFavoriteModels(): { models: Model[]; isLoading: boolean } {
  const { hasKey } = useApiKeyStatus("openrouter");
  const { data: settings, isLoading: isSettingsLoading } = useUserSettings();
  const favoriteIds = settings?.favoriteModels ?? [];

  const { data: favoriteModels, isLoading: isModelsLoading } = useQuery({
    queryKey: [...MODELS_KEY, "favorites", favoriteIds],
    queryFn: () => fetchModelsByIds(favoriteIds),
    enabled: hasKey && favoriteIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    models: favoriteModels ?? [],
    isLoading: isSettingsLoading || isModelsLoading,
  };
}
