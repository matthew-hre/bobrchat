"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { Model } from "@openrouter/sdk/models";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Fuse from "fuse.js";
import {
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  clearModelCache,
  getCachedModels,
  setCachedModels,
} from "~/lib/cache/model-cache";
import { fetchOpenRouterModels } from "~/server/actions/settings";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Skeleton } from "../../ui/skeleton";
import { useUserSettingsContext } from "../user-settings-provider";
import { ModelCard } from "./model-card";
import { SortableFavoriteModel } from "./sortable-favorite-model";

export function ModelsTab() {
  const { settings, updateFavoriteModels } = useUserSettingsContext();
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(
    () => settings?.favoriteModels ?? [],
  );
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchAndCacheModels = useCallback(async () => {
    try {
      // Try to get API key from localStorage (client-side storage)
      let apiKey: string | undefined;
      if (settings?.apiKeyStorage?.openrouter === "client") {
        apiKey = localStorage.getItem("openrouter_api_key") ?? undefined;
      }

      const result = await fetchOpenRouterModels(apiKey);

      setModels(result);
      setCachedModels(result);
      // Only set selectedModels if we don't already have any (initial load)
      setSelectedModels(prev => prev.length > 0 ? prev : (settings?.favoriteModels ?? []));
    }
    catch (error) {
      console.error("[ModelsTab] Error fetching models:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch models");
    }
    finally {
      setIsLoading(false);
    }
  }, [settings?.apiKeyStorage?.openrouter, settings?.favoriteModels]);

  const handleFetchModels = useCallback(async () => {
    // Check cache first
    const { data: cachedModels, isFresh } = getCachedModels<Model[]>();

    if (cachedModels && cachedModels.length > 0) {
      setModels(cachedModels);
      setSelectedModels(prev => prev.length > 0 ? prev : (settings?.favoriteModels ?? []));

      // If cache is stale, refresh in background
      if (!isFresh) {
        fetchAndCacheModels();
      }

      return;
    }

    // No cache - show loading and fetch immediately
    setIsLoading(true);
    await fetchAndCacheModels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.favoriteModels]);

  const handleRefreshModels = useCallback(async () => {
    clearModelCache();
    setIsRefreshing(true);
    setIsLoading(true);
    await fetchAndCacheModels();
    setIsRefreshing(false);
    toast.success("Models updated successfully");
  }, [fetchAndCacheModels]);

  // Auto-fetch models on mount (only if not already loaded)
  useEffect(() => {
    if (models.length === 0) {
      handleFetchModels();
    }
  }, [handleFetchModels, models.length]);

  // Fuzzy search setup
  const fuse = useMemo(() => {
    if (!models.length)
      return null;
    return new Fuse(models, {
      keys: ["name", "id", "description"],
      threshold: 0.3,
      minMatchCharLength: 2,
    });
  }, [models]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !fuse) {
      return models;
    }
    return fuse.search(searchQuery).map(result => result.item);
  }, [searchQuery, fuse, models]);

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length >= 10) {
        toast.error("Maximum 10 models allowed");
        return prev;
      }
      return [...prev, modelId];
    });
  };

  // Persist selected models to database via context (for optimistic updates)
  useEffect(() => {
    const persistModels = async () => {
      if (!selectedModels || selectedModels.length === 0)
        return;
      // Skip if selectedModels matches context (no change)
      if (JSON.stringify(selectedModels) === JSON.stringify(settings?.favoriteModels))
        return;
      try {
        await updateFavoriteModels(selectedModels);
      }
      catch (error) {
        console.error("Failed to save favorite models:", error);
        toast.error("Failed to save favorite models");
      }
    };

    const timeoutId = setTimeout(persistModels, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedModels, settings?.favoriteModels, updateFavoriteModels]);

  // Handle drag end to reorder favorites
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedModels((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  // Get selected model objects for display
  const selectedModelObjects = useMemo(() => {
    if (!selectedModels.length)
      return [];
    return selectedModels
      .map(modelId => models.find(m => m.id === modelId))
      .filter((m): m is Model => m !== undefined);
  }, [selectedModels, models]);

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-border border-b px-6 py-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Models</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshModels}
            disabled={isRefreshing || isLoading}
            className="absolute top-4 right-4 gap-2 text-sm"
          >
            <RefreshCwIcon
              size={8}
              className={isRefreshing ? "animate-spin" : ""}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          Search and manage your favorite OpenRouter models (max 10)
        </p>
      </div>

      {/* Search Bar */}
      {models.length > 0 && (
        <div className="border-border border-b px-6 py-3">
          <div className="relative">
            <SearchIcon className={`
              text-muted-foreground absolute top-1/2 left-3 size-4
              -translate-y-1/2
            `}
            />
            <Input
              placeholder="Search by name, ID, or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-muted-foreground mt-2 text-xs">
            {`${searchResults.length} of ${models.length} models`}
          </div>
        </div>
      )}

      {/* Favorites Section with Accordion and Drag & Drop */}
      {selectedModelObjects.length > 0 && (
        <div className="border-border border-b">
          <Accordion
            type="single"
            collapsible
            value={favoritesOpen ? "favorites" : ""}
            onValueChange={value => setFavoritesOpen(value === "favorites")}
          >
            <AccordionItem value="favorites" className="border-0">
              <AccordionTrigger className={`
                hover:bg-muted/30
                rounded-none px-6 py-3
              `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    Favorite Models
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {selectedModelObjects.length}
                    /10
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 border-t px-6 py-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedModels}
                    strategy={verticalListSortingStrategy}
                  >
                    {selectedModelObjects.map(model => (
                      <SortableFavoriteModel
                        key={model.id}
                        model={model}
                        onRemove={() => toggleModel(model.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading
          ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="border-border space-y-2 rounded-lg border p-4"
                  >
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )
          : models.length === 0
            ? (
                <div className={`
                  flex flex-col items-center justify-center py-12 text-center
                `}
                >
                  <div className="bg-muted mb-4 rounded-full p-3">
                    <SparklesIcon className="text-muted-foreground size-6" />
                  </div>
                  <h3 className="mb-1 font-medium">No models loaded</h3>
                  <p className="text-muted-foreground mb-6 text-sm">
                    Loading available models from OpenRouter...
                  </p>
                </div>
              )
            : searchResults.length === 0
              ? (
                  <div className={`
                    flex flex-col items-center justify-center py-12 text-center
                  `}
                  >
                    <p className="text-muted-foreground text-sm">No models match your search</p>
                  </div>
                )
              : (
                  <div className="grid gap-3">
                    {searchResults
                      .filter(m => !selectedModels.includes(m.id))
                      .map((model) => {
                        const isSelected = selectedModels.includes(model.id);
                        return (<ModelCard key={model.id} model={model} isSelected={isSelected} toggleModel={toggleModel} />);
                      })}
                  </div>
                )}
      </div>
    </div>
  );
}
