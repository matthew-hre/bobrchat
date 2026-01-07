"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";

import type { UserSettingsData } from "~/lib/db/schema/settings";
import type { PreferencesUpdate } from "~/lib/schemas/settings";

import { useSession } from "~/lib/auth-client";
import {
  deleteApiKey as deleteApiKeyAction,
  syncUserSettings,
  updateApiKey as updateApiKeyAction,
  updateFavoriteModels as updateFavoriteModelsAction,
  updatePreferences,
} from "~/server/actions/settings";

type UserSettingsContextType = {
  settings: UserSettingsData | null;
  loading: boolean;
  error: string | null;
  updateSetting: (updates: PreferencesUpdate) => Promise<void>;
  updateFavoriteModels: (favoriteModels: string[]) => Promise<void>;
  setApiKey: (
    provider: "openrouter" | "parallel",
    apiKey: string,
    storeServerSide?: boolean,
  ) => Promise<void>;
  removeApiKey: (provider: "openrouter" | "parallel") => Promise<void>;
};

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(
  undefined,
);

export function UserSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [state, setState] = useState<{
    settings: UserSettingsData | null;
    loading: boolean;
    error: string | null;
  }>({
    settings: null,
    loading: true,
    error: null,
  });

  // Fetch and sync settings on mount (only if user is authenticated)
  useEffect(() => {
    const fetchSettings = async () => {
      // Skip fetching if user is not authenticated
      if (!session?.user) {
        setState({
          settings: null,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        // Sync settings and clean up orphaned data
        const settings = await syncUserSettings();

        setState({
          settings,
          loading: false,
          error: null,
        });
      }
      catch (error) {
        console.error("Failed to fetch settings:", error);
        setState(prev => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error ? error.message : "Unknown error",
        }));
      }
    };

    fetchSettings();
  }, [session?.user]);

  const updateSetting = useCallback(
    async (updates: PreferencesUpdate): Promise<void> => {
      const previousSettings = state.settings;

      try {
        // Optimistically update state
        setState(prev => ({
          ...prev,
          settings: prev.settings
            ? { ...prev.settings, ...updates }
            : null,
        }));

        // Call server action
        await updatePreferences(updates);
      }
      catch (error) {
        // Revert on error
        console.error("Failed to update settings:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update settings";
        setState({
          settings: previousSettings,
          loading: false,
          error: errorMessage,
        });
      }
    },
    [state.settings],
  );

  const updateFavoriteModels = useCallback(
    async (favoriteModels: string[]): Promise<void> => {
      const previousSettings = state.settings;

      try {
        // Optimistically update state
        setState(prev => ({
          ...prev,
          settings: prev.settings
            ? { ...prev.settings, favoriteModels }
            : null,
        }));

        // Call server action
        await updateFavoriteModelsAction({ favoriteModels });
      }
      catch (error) {
        // Revert on error
        console.error("Failed to update favorite models:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update favorite models";
        setState({
          settings: previousSettings,
          loading: false,
          error: errorMessage,
        });
        throw error;
      }
    },
    [state.settings],
  );

  const setApiKey = useCallback(
    async (
      provider: "openrouter" | "parallel",
      apiKey: string,
      storeServerSide: boolean = false,
    ): Promise<void> => {
      try {
        await updateApiKeyAction(provider, apiKey, storeServerSide);

        // Sync browser localStorage based on storage preference
        const localStorageKey = `${provider}_api_key`;
        if (storeServerSide) {
          // Server-side storage: remove from localStorage (key is in DB encrypted)
          localStorage.removeItem(localStorageKey);
        }
        else {
          // Client-side storage: store key locally
          localStorage.setItem(localStorageKey, apiKey);
        }

        // Update local state preference
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
        throw error;
      }
    },
    [],
  );

  const removeApiKey = useCallback(
    async (provider: "openrouter" | "parallel"): Promise<void> => {
      try {
        await deleteApiKeyAction(provider);

        // Remove from browser localStorage
        const localStorageKey = `${provider}_api_key`;
        localStorage.removeItem(localStorageKey);

        // Update local state preference
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
        throw error;
      }
    },
    [],
  );

  return (
    <UserSettingsContext
      value={{
        settings: state.settings,
        loading: state.loading,
        error: state.error,
        updateSetting,
        updateFavoriteModels,
        setApiKey,
        removeApiKey,
      }}
    >
      {children}
    </UserSettingsContext>
  );
}

export function useUserSettingsContext() {
  const context = use(UserSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useUserSettingsContext must be used within UserSettingsProvider",
    );
  }
  return context;
}
