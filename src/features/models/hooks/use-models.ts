"use client";

import type { Model } from "@openrouter/sdk/models";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useHasAnyApiKey } from "~/features/settings/hooks/use-api-status";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { MODELS_KEY } from "~/lib/queries/query-keys";

import type { ModelListItem, ModelsListQueryResult, ModelsQueryParams, ModelsQueryResult } from "../types";

import { fetchModels, fetchModelsByIds, fetchModelsByIdsForList, fetchModelsForList } from "../actions";

export { MODELS_KEY };

/**
 * Fetch models with filtering, sorting, and pagination
 */
export function useModelsQuery(
  params: ModelsQueryParams,
  options: { enabled?: boolean } = {},
) {
  const { hasKey, accessibleProviders } = useHasAnyApiKey();
  const mergedParams = accessibleProviders
    ? { ...params, providers: params.providers?.length ? params.providers : accessibleProviders }
    : params;

  return useQuery<ModelsQueryResult>({
    queryKey: [...MODELS_KEY, mergedParams],
    queryFn: () => fetchModels(mergedParams),
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
  const { hasKey } = useHasAnyApiKey();
  const { data: settings, isPending: isSettingsPending } = useUserSettings();
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
    isLoading: isSettingsPending || isModelsLoading,
  };
}

/**
 * Get favorite models for list view (lightweight)
 */
export function useFavoriteModelsForList(): { models: ModelListItem[]; isLoading: boolean } {
  const { hasKey } = useHasAnyApiKey();
  const { data: settings, isLoading: isSettingsLoading } = useUserSettings();
  const favoriteIds = settings?.favoriteModels ?? [];

  const { data: favoriteModels, isLoading: isModelsLoading } = useQuery({
    queryKey: [...MODELS_KEY, "favorites-list", favoriteIds],
    queryFn: () => fetchModelsByIdsForList(favoriteIds),
    enabled: hasKey && favoriteIds.length > 0,
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
  const { hasKey, accessibleProviders } = useHasAnyApiKey();
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const mergedParams = accessibleProviders
    ? { ...params, providers: params.providers?.length ? params.providers : accessibleProviders }
    : params;

  const query = useInfiniteQuery<ModelsQueryResult>({
    queryKey: [...MODELS_KEY, "infinite", { ...mergedParams, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchModels({ ...mergedParams, pageSize, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: hasKey && options.enabled !== false,
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
  const { hasKey, accessibleProviders } = useHasAnyApiKey();
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const mergedParams = accessibleProviders
    ? { ...params, providers: params.providers?.length ? params.providers : accessibleProviders }
    : params;

  const query = useInfiniteQuery<ModelsListQueryResult>({
    queryKey: [...MODELS_KEY, "infinite-list", { ...mergedParams, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchModelsForList({ ...mergedParams, pageSize, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: hasKey && options.enabled !== false,
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
