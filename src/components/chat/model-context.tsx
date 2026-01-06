"use client";

import type { Model } from "@openrouter/sdk/models";

import { createContext, use, useEffect, useState } from "react";

import { useUserSettingsContext } from "~/components/settings/user-settings-provider";
import {
  getCachedModels,
  setCachedModels,
} from "~/lib/cache/model-cache";
import { fetchOpenRouterModels } from "~/server/actions/settings";

type ModelContextType = {
  models: Model[];
  selectedModelId: string | null;
  setSelectedModelId: (modelId: string) => void;
  isLoading: boolean;
};

const ModelContext = createContext<ModelContextType | null>(null);

const SELECTED_MODEL_KEY = "selected_model_id";

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useUserSettingsContext();
  const [selectedModelId, setSelectedModelIdState] = useState<string | null>(null);
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAndCacheModels = async () => {
    try {
      let apiKey: string | undefined;
      if (settings?.apiKeyStorage?.openrouter === "client") {
        apiKey = localStorage.getItem("openrouter_api_key") ?? undefined;
      }
      const models = await fetchOpenRouterModels(apiKey);
      setAllModels(models);
      setCachedModels(models);
    }
    catch (error) {
      console.error("[ModelContext] Failed to fetch models:", error);
      setAllModels([]);
    }
    finally {
      setIsLoading(false);
    }
  };

  // Fetch all models from OpenRouter with intelligent caching
  useEffect(() => {
    const initializeModels = async () => {
      // Check cache first (immediate response)
      const { data: cachedModels, isFresh } = getCachedModels<Model[]>();

      if (cachedModels && cachedModels.length > 0) {
        setAllModels(cachedModels);

        // If cache is stale, refresh in background
        if (!isFresh) {
          fetchAndCacheModels();
        }

        return;
      }

      // No cache - show loading and fetch immediately
      setIsLoading(true);
      await fetchAndCacheModels();
    };

    // Only initialize if we have an API key configured (client or server)
    const hasApiKeyConfigured = settings?.apiKeyStorage?.openrouter === "client"
      || settings?.apiKeyStorage?.openrouter === "server";

    if (hasApiKeyConfigured) {
      initializeModels();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.apiKeyStorage?.openrouter]);

  // Initialize selectedModelId from localStorage or first favorite
  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const savedModelId = localStorage.getItem(SELECTED_MODEL_KEY);
    if (settings?.favoriteModels && settings.favoriteModels.length > 0) {
      const modelToSelect = savedModelId && settings.favoriteModels.includes(savedModelId)
        ? savedModelId
        : settings.favoriteModels[0];
      setSelectedModelIdState(modelToSelect);
    }
    else {
      // Reset if no favorites available
      setSelectedModelIdState(null);
    }
  }, [settings?.favoriteModels]);

  // Validate selectedModelId is still in favorites when they change
  useEffect(() => {
    if (!selectedModelId || !settings?.favoriteModels) {
      return;
    }

    // If currently selected model is no longer in favorites, reset to first favorite
    if (!settings.favoriteModels.includes(selectedModelId) && settings.favoriteModels.length > 0) {
      const firstFavoriteId = settings.favoriteModels[0];
      setSelectedModelIdState(firstFavoriteId);
      localStorage.setItem(SELECTED_MODEL_KEY, firstFavoriteId);
    }
  }, [settings?.favoriteModels, selectedModelId]);

  const handleSetSelectedModelId = (modelId: string) => {
    setSelectedModelIdState(modelId);
    if (typeof window !== "undefined") {
      localStorage.setItem(SELECTED_MODEL_KEY, modelId);
    }
  };

  // Filter models to only show favorites and enrich with full metadata
  const enrichedModels = settings?.favoriteModels
    ? settings.favoriteModels
        .map(modelId => allModels.find(m => m.id === modelId))
        .filter((m): m is Model => m !== undefined)
    : [];

  return (
    <ModelContext
      value={{
        models: enrichedModels,
        selectedModelId,
        setSelectedModelId: handleSetSelectedModelId,
        isLoading,
      }}
    >
      {children}
    </ModelContext>
  );
}

export function useModelContext() {
  const context = use(ModelContext);
  if (!context) {
    throw new Error("useModelContext must be used within ModelProvider");
  }
  return context;
}
