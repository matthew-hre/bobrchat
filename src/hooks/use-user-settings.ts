"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { UserSettingsData } from "~/lib/db/schema/settings";

import {
  deleteApiKey as deleteApiKeyAction,
  updateApiKey as updateApiKeyAction,
  updatePreferences,
} from "~/server/actions/settings";

type UserSettingsState = {
  settings: UserSettingsData | null;
  loading: boolean;
  error: string | null;
};

/**
 * Hook for managing user settings
 * Fetches settings on mount and provides helper methods for updates
 *
 * @returns {object} Settings state and update functions
 */
export function useUserSettings() {
  const [state, setState] = useState<UserSettingsState>({
    settings: null,
    loading: true,
    error: null,
  });

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");

        if (!response.ok) {
          throw new Error(`Failed to fetch settings: ${response.statusText}`);
        }

        const settings = (await response.json()) as UserSettingsData;

        setState({
          settings,
          loading: false,
          error: null,
        });
      }
      catch (error) {
        console.error("Failed to fetch settings:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        toast.error("Failed to load settings");
      }
    };

    fetchSettings();
  }, []);

  /**
   * Update user preferences (theme, instructions, thread name)
   */
  const updateSetting = useCallback(
    async (updates: Partial<UserSettingsData>): Promise<void> => {
      try {
        // Optimistically update state
        setState(prev => ({
          ...prev,
          settings: prev.settings ? { ...prev.settings, ...updates } : null,
        }));

        // Call server action
        await updatePreferences(updates);
      }
      catch (error) {
        // Revert on error
        console.error("Failed to update settings:", error);
        toast.error("Failed to update settings");
        // Re-fetch to get latest state
        const response = await fetch("/api/settings");
        const settings = (await response.json()) as UserSettingsData;
        setState({
          settings,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [],
  );

  /**
   * Update API key for a provider
   */
  const setApiKey = useCallback(
    async (provider: "openrouter", apiKey: string, storeServerSide: boolean = false): Promise<void> => {
      try {
        await updateApiKeyAction(provider, apiKey, storeServerSide);

        // Update local storage preference
        setState(prev => ({
          ...prev,
          settings: prev.settings
            ? {
                ...prev.settings,
                apiKeyStorage: {
                  ...prev.settings.apiKeyStorage,
                  [provider]: storeServerSide ? "server" : "client",
                },
              }
            : null,
        }));
      }
      catch (error) {
        console.error("Failed to update API key:", error);
        toast.error("Failed to save API key");
        throw error;
      }
    },
    [],
  );

  /**
   * Delete API key for a provider
   */
  const removeApiKey = useCallback(
    async (provider: "openrouter"): Promise<void> => {
      try {
        await deleteApiKeyAction(provider);

        // Update local storage preference
        setState((prev) => {
          if (!prev.settings)
            return prev;

          const newStorage = { ...prev.settings.apiKeyStorage };
          delete newStorage[provider];

          return {
            ...prev,
            settings: {
              ...prev.settings,
              apiKeyStorage: newStorage,
            },
          };
        });
      }
      catch (error) {
        console.error("Failed to delete API key:", error);
        toast.error("Failed to remove API key");
        throw error;
      }
    },
    [],
  );

  return {
    settings: state.settings,
    loading: state.loading,
    error: state.error,
    updateSetting,
    setApiKey,
    removeApiKey,
  };
}
