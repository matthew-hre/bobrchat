"use client";

import type { Model } from "@openrouter/sdk/models";

import Fuse from "fuse.js";
import {
  BrainIcon,
  FileIcon,
  ImageIcon,
  SearchIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "~/lib/utils";
import { fetchOpenRouterModels, updateFavoriteModels } from "~/server/actions/settings";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { useUserSettingsContext } from "./user-settings-provider";

export function ModelsTab() {
  const { settings } = useUserSettingsContext();
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(
    () => settings?.favoriteModels ?? [],
  );
  const [favoritesOpen, setFavoritesOpen] = useState(true);

  const handleFetchModels = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to get API key from localStorage (client-side storage)
      let apiKey: string | undefined;
      if (settings?.apiKeyStorage?.openrouter === "client") {
        apiKey = localStorage.getItem("openrouter_api_key") ?? undefined;
      }

      const result = await fetchOpenRouterModels(apiKey);

      setModels(result);
      setSelectedModels(settings?.favoriteModels ?? []);
    }
    catch (error) {
      console.error("Error fetching models:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch models");
    }
    finally {
      setIsLoading(false);
    }
  }, [settings?.apiKeyStorage?.openrouter, settings?.favoriteModels]);

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

  // Persist selected models to database
  useEffect(() => {
    const persistModels = async () => {
      if (!selectedModels || selectedModels.length === 0)
        return;
      try {
        await updateFavoriteModels({ favoriteModels: selectedModels });
      }
      catch (error) {
        console.error("Failed to save favorite models:", error);
        toast.error("Failed to save favorite models");
      }
    };

    const timeoutId = setTimeout(persistModels, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedModels]);

  const formatPrice = (price: number | null): string => {
    if (!price)
      return "Free";
    if (price < 0.000001)
      return "$0.000001/1M";
    return `$${(price * 1000000).toFixed(2)}/1M`;
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
        <h2 className="text-lg font-semibold">Models</h2>
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

      {/* Favorites Section with Accordion */}
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
                px-6 py-3
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
                {selectedModelObjects.map(model => (
                  <div
                    key={model.id}
                    className={cn(
                      `
                        flex items-center justify-between rounded-lg border p-3
                        text-xs transition-all
                      `,
                      "border-primary bg-primary/5",
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {model.id}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-2 p-0"
                      onClick={() => toggleModel(model.id)}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ))}
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
                        return (
                          <button
                            key={model.id}
                            onClick={() => toggleModel(model.id)}
                            className={cn(
                              `
                                hover:border-primary/50
                                rounded-lg border p-4 text-left transition-all
                              `,
                              isSelected
                                ? `border-primary bg-primary/5`
                                : `
                                  border-border
                                  hover:bg-muted/50
                                `,
                            )}
                          >
                            {/* Name and selection indicator */}
                            <div className={`
                              mb-2 flex items-start justify-between gap-3
                            `}
                            >
                              <div className="flex-1">
                                <h3 className={`
                                  text-sm leading-snug font-semibold
                                `}
                                >
                                  {model.name}
                                </h3>
                                <p className="text-muted-foreground text-xs">
                                  {model.id}
                                </p>
                              </div>
                              <div
                                className={cn(
                                  `
                                    mt-0.5 flex size-5 shrink-0 items-center
                                    justify-center rounded border transition-all
                                  `,
                                  isSelected
                                    ? `border-primary bg-primary`
                                    : `
                                      border-muted-foreground/30
                                      hover:border-primary/50
                                    `,
                                )}
                              >
                                {isSelected && (
                                  <div className={`
                                    bg-primary-foreground size-2 rounded-[2px]
                                  `}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Pricing */}
                            <div className="flex gap-4 text-xs">
                              <div>
                                <span className="text-muted-foreground">
                                  Input:
                                </span>
                                <span className="font-mono font-medium">
                                  {formatPrice(model.pricing?.prompt ?? null)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Output:
                                </span>
                                <span className="font-mono font-medium">
                                  {formatPrice(model.pricing?.completion ?? null)}
                                </span>
                              </div>
                            </div>

                            {/* Features */}
                            <div className="flex flex-wrap gap-2">
                              {model.architecture.inputModalities.includes("image") && (
                                <FeatureBadge icon={ImageIcon} label="Image Upload" />
                              )}
                              {(model.contextLength && model.contextLength > 8096) && (
                                <FeatureBadge icon={SearchIcon} label="Search" />
                              )}
                              {model.supportedParameters.includes("reasoning") && (
                                <FeatureBadge icon={BrainIcon} label="Reasoning" />
                              )}
                              {model.architecture.inputModalities.includes("file") && (
                                <FeatureBadge icon={FileIcon} label="File Upload" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
      </div>

      {/* Footer */}
      <div className="border-border space-y-3 border-t px-6 py-4">
        {models.length > 0 && selectedModels.length > 0 && (
          <p className="text-muted-foreground text-xs">
            {selectedModels.length}
            {" "}
            model
            {selectedModels.length !== 1 ? "s" : ""}
            {" "}
            selected
          </p>
        )}
      </div>
    </div>
  );
}

function FeatureBadge({
  icon: Icon,
  label,
}: {
  icon: typeof SparklesIcon;
  label: string;
}) {
  return (
    <div className={`
      bg-muted mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1
      text-xs font-medium
    `}
    >
      <Icon className="size-3" />
      {label}
    </div>
  );
}
