"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PreferencesUpdate, UserSettingsData } from "~/features/settings/types";
import type { ApiKeyProvider } from "~/lib/api-keys/types";

import {
  deleteApiKey,
  syncUserSettings,
  updateApiKey,
  updateFavoriteModels,
  updatePreferences,
} from "~/features/settings/actions";
import { USER_SETTINGS_KEY } from "~/lib/queries/query-keys";

export { USER_SETTINGS_KEY };

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
    onSuccess: (updatedSettings) => {
      // Use the server-returned settings to ensure cache is in sync
      queryClient.setQueryData<UserSettingsData>(USER_SETTINGS_KEY, old =>
        old ? { ...old, ...updatedSettings } : updatedSettings);
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(USER_SETTINGS_KEY, context.previous);
      }
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

export const OPENROUTER_CREDITS_KEY = ["openrouterCredits"];

export function useSetApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      provider,
      apiKey,
    }: {
      provider: ApiKeyProvider;
      apiKey: string;
    }) => updateApiKey(provider, apiKey),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
      if (variables.provider === "openrouter") {
        queryClient.invalidateQueries({ queryKey: OPENROUTER_CREDITS_KEY });
      }
    },
  });
}

export function useRemoveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: ApiKeyProvider) => deleteApiKey(provider),
    onSettled: (_data, _error, provider) => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
      if (provider === "openrouter") {
        queryClient.invalidateQueries({ queryKey: OPENROUTER_CREDITS_KEY });
      }
    },
  });
}
