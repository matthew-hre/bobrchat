"use client";

import type { Model } from "@openrouter/sdk/models";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useApiKeyStatus } from "~/features/settings/hooks/use-api-status";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { MODELS_KEY } from "~/lib/queries/query-keys";

import type { ModelListItem, ModelsListQueryResult, ModelsQueryParams, ModelsQueryResult } from "../types";

import { fetchAvailableModelIds, fetchModels, fetchModelsByIds, fetchModelsByIdsForList, fetchModelsForList } from "../actions";

export { MODELS_KEY };

/**
 * Fetch models with filtering, sorting, and pagination
 */
export function useModelsQuery(
  params: ModelsQueryParams,
  options: { enabled?: boolean } = {},
) {
  const { hasKey: hasOpenRouterKey } = useApiKeyStatus("openrouter");
  const { hasKey: hasOpenAIKey } = useApiKeyStatus("openai");
  const hasAnyChatKey = hasOpenRouterKey || hasOpenAIKey;

  return useQuery<ModelsQueryResult>({
    queryKey: [...MODELS_KEY, params],
    queryFn: () => fetchModels(params),
    enabled: hasAnyChatKey && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Get favorite models by fetching only the needed IDs.
 * Also returns which models are unavailable given the user's current API keys.
 * - If user has OpenRouter key → all models are available
 * - If user only has direct provider keys → only models in modelProviderAvailability are available
 */
export function useFavoriteModels(): { models: Model[]; isLoading: boolean; unavailableModelIds: Set<string> } {
  const { hasKey: hasOpenRouterKey } = useApiKeyStatus("openrouter");
  const { hasKey: hasOpenAIKey } = useApiKeyStatus("openai");
  const hasAnyChatKey = hasOpenRouterKey || hasOpenAIKey;
  const { data: settings, isPending: isSettingsPending } = useUserSettings();
  const favoriteIds = useMemo(() => settings?.favoriteModels ?? [], [settings?.favoriteModels]);

  const { data: favoriteModels, isLoading: isModelsLoading } = useQuery({
    queryKey: [...MODELS_KEY, "favorites", favoriteIds],
    queryFn: () => fetchModelsByIds(favoriteIds),
    enabled: hasAnyChatKey && favoriteIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Determine which direct providers the user has keys for
  const directProviders = useMemo(() => {
    const providers: string[] = [];
    if (hasOpenAIKey)
      providers.push("openai");
    return providers;
  }, [hasOpenAIKey]);

  // Only check availability when user doesn't have OpenRouter (which supports everything)
  const needsAvailabilityCheck = !hasOpenRouterKey && directProviders.length > 0 && favoriteIds.length > 0;

  const { data: availableIds } = useQuery({
    queryKey: [...MODELS_KEY, "availability", favoriteIds, directProviders],
    queryFn: () => fetchAvailableModelIds(favoriteIds, directProviders),
    enabled: needsAvailabilityCheck,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const unavailableModelIds = useMemo(() => {
    if (hasOpenRouterKey)
      return new Set<string>();
    if (directProviders.length === 0)
      return new Set<string>();
    if (!availableIds)
      return new Set<string>();

    const availableSet = new Set(availableIds);
    return new Set(favoriteIds.filter(id => !availableSet.has(id)));
  }, [hasOpenRouterKey, directProviders, availableIds, favoriteIds]);

  return {
    models: favoriteModels ?? [],
    isLoading: isSettingsPending || isModelsLoading,
    unavailableModelIds,
  };
}

/**
 * Get favorite models for list view (lightweight)
 */
export function useFavoriteModelsForList(): { models: ModelListItem[]; isLoading: boolean } {
  const { hasKey: hasOpenRouterKey } = useApiKeyStatus("openrouter");
  const { hasKey: hasOpenAIKey } = useApiKeyStatus("openai");
  const hasAnyChatKey = hasOpenRouterKey || hasOpenAIKey;
  const { data: settings, isLoading: isSettingsLoading } = useUserSettings();
  const favoriteIds = settings?.favoriteModels ?? [];

  const { data: favoriteModels, isLoading: isModelsLoading } = useQuery({
    queryKey: [...MODELS_KEY, "favorites-list", favoriteIds],
    queryFn: () => fetchModelsByIdsForList(favoriteIds),
    enabled: hasAnyChatKey && favoriteIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    models: favoriteModels ?? [],
    isLoading: isSettingsLoading || isModelsLoading,
  };
}

type InfiniteModelsQueryParams = Omit<ModelsQueryParams, "page">;

const DEFAULT_PAGE_SIZE = 50;

export function useInfiniteModelsQuery(
  params: InfiniteModelsQueryParams = {},
  options: { enabled?: boolean } = {},
) {
  const { hasKey: hasOpenRouterKey } = useApiKeyStatus("openrouter");
  const { hasKey: hasOpenAIKey } = useApiKeyStatus("openai");
  const hasAnyChatKey = hasOpenRouterKey || hasOpenAIKey;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  const query = useInfiniteQuery<ModelsQueryResult>({
    queryKey: [...MODELS_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchModels({ ...params, pageSize, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: hasAnyChatKey && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Deduplicate models by id to prevent React key warnings
  const models = useMemo(() => {
    const allModels = query.data?.pages.flatMap(page => page.models) ?? [];
    const seen = new Set<string>();
    return allModels.filter((model) => {
      if (seen.has(model.id)) {
        return false;
      }
      seen.add(model.id);
      return true;
    });
  }, [query.data?.pages]);

  const total = query.data?.pages[0]?.total ?? 0;

  return {
    models,
    total,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
  };
}

/**
 * Infinite query for model list view with lightweight payload
 * Returns only fields needed for list display
 */
export function useInfiniteModelsListQuery(
  params: InfiniteModelsQueryParams = {},
  options: { enabled?: boolean } = {},
): {
  models: ModelListItem[];
  total: number;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
} {
  const { hasKey: hasOpenRouterKey } = useApiKeyStatus("openrouter");
  const { hasKey: hasOpenAIKey } = useApiKeyStatus("openai");
  const hasAnyChatKey = hasOpenRouterKey || hasOpenAIKey;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  const query = useInfiniteQuery<ModelsListQueryResult>({
    queryKey: [...MODELS_KEY, "infinite-list", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchModelsForList({ ...params, pageSize, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: hasAnyChatKey && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Deduplicate models by id to prevent React key warnings
  // This can happen when pages are refetched or during query transitions
  const models = useMemo(() => {
    const allModels = query.data?.pages.flatMap(page => page.models) ?? [];
    const seen = new Set<string>();
    return allModels.filter((model) => {
      if (seen.has(model.id)) {
        return false;
      }
      seen.add(model.id);
      return true;
    });
  }, [query.data?.pages]);

  const total = query.data?.pages[0]?.total ?? 0;

  return {
    models,
    total,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
  };
}
