"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiKeyProvider, UserSettingsData } from "~/lib/db/schema/settings";
import type { PreferencesUpdate } from "~/lib/schemas/settings";

import {
  deleteApiKey,
  syncUserSettings,
  updateApiKey,
  updateFavoriteModels,
  updatePreferences,
} from "~/server/actions/settings";

export const USER_SETTINGS_KEY = ["user-settings"] as const;

export function useUserSettings(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: USER_SETTINGS_KEY,
    queryFn: () => syncUserSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options.enabled,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: PreferencesUpdate) => updatePreferences(updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: USER_SETTINGS_KEY });
      const previous = queryClient.getQueryData<UserSettingsData>(USER_SETTINGS_KEY);
      queryClient.setQueryData<UserSettingsData>(USER_SETTINGS_KEY, old =>
        old ? { ...old, ...updates } : old);
      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(USER_SETTINGS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
    },
  });
}

export function useUpdateFavoriteModels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (favoriteModels: string[]) => updateFavoriteModels({ favoriteModels }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
    },
  });
}

export function useSetApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      provider,
      apiKey,
      storeServerSide,
    }: {
      provider: ApiKeyProvider;
      apiKey: string;
      storeServerSide?: boolean;
    }) => updateApiKey(provider, apiKey, storeServerSide),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
    },
  });
}

export function useRemoveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: ApiKeyProvider) => deleteApiKey(provider),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
    },
  });
}
