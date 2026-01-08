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
import { useQueryClient } from "@tanstack/react-query";
import Fuse from "fuse.js";
import {
  BrainIcon,
  FileTextIcon,
  ImageIcon,
  Loader2,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { MODELS_KEY, useModels } from "~/lib/queries/use-models";
import { useUpdateFavoriteModels, useUserSettings } from "~/lib/queries/use-user-settings";
import { cn } from "~/lib/utils";
import { getModelCapabilities } from "~/lib/utils/model-capabilities";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Skeleton } from "../../ui/skeleton";
import { ModelCard } from "./model-card";
import { SortableFavoriteModel } from "./sortable-favorite-model";

const MODELS_PER_PAGE = 30;

type CapabilityFilter = "image" | "pdf" | "search" | "reasoning";
type SortOrder = "provider-asc" | "provider-desc" | "model-asc" | "model-desc" | "cost-asc" | "cost-desc";

export function ModelsTab() {
  const { data: settings } = useUserSettings({ enabled: true });
  const { data: models = [], isLoading, isFetching, refetch } = useModels({ enabled: true });
  const updateFavoriteModels = useUpdateFavoriteModels();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(MODELS_PER_PAGE);
  const [capabilityFilters, setCapabilityFilters] = useState<CapabilityFilter[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("provider-asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const initializedRef = useRef(false);
  const observerTargetRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (settings && !initializedRef.current) {
      initializedRef.current = true;
      setSelectedModels(settings.favoriteModels ?? []);
    }
  }, [settings]);

  const fuse = useMemo(() => {
    if (!models.length)
      return null;
    return new Fuse(models, {
      keys: ["name", "id", "description"],
      threshold: 0.2,
      minMatchCharLength: 3,
    });
  }, [models]);

  const searchResults = useMemo(() => {
    let results = models;

    if (searchQuery.trim() && fuse) {
      results = fuse.search(searchQuery).map(result => result.item);
    }

    if (capabilityFilters.length > 0) {
      results = results.filter((model) => {
        const caps = getModelCapabilities(model);
        return capabilityFilters.every((filter) => {
          switch (filter) {
            case "image":
              return caps.supportsImages;
            case "pdf":
              return caps.supportsPdf || caps.supportsNativePdf;
            case "search":
              return caps.supportsSearch;
            case "reasoning":
              return caps.supportsReasoning;
            default:
              return true;
          }
        });
      });
    }

    const sorted = [...results].sort((a, b) => {
      const [providerA, modelA] = a.id.split("/");
      const [providerB, modelB] = b.id.split("/");

      switch (sortOrder) {
        case "provider-asc":
          return providerA.localeCompare(providerB) || modelA.localeCompare(modelB);
        case "provider-desc":
          return providerB.localeCompare(providerA) || modelB.localeCompare(modelA);
        case "model-asc":
          return modelA.localeCompare(modelB);
        case "model-desc":
          return modelB.localeCompare(modelA);
        case "cost-asc":
          return (a.pricing?.completion ?? 0) - (b.pricing?.completion ?? 0);
        case "cost-desc":
          return (b.pricing?.completion ?? 0) - (a.pricing?.completion ?? 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [searchQuery, fuse, models, capabilityFilters, sortOrder]);

  // Reset displayed count when search query or filters change
  useEffect(() => {
    setDisplayedCount(MODELS_PER_PAGE);
  }, [searchQuery, capabilityFilters, sortOrder]);

  const toggleCapabilityFilter = (filter: CapabilityFilter) => {
    setCapabilityFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter],
    );
  };

  const activeFilterCount = capabilityFilters.length + (sortOrder !== "provider-asc" ? 1 : 0);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && displayedCount < searchResults.length) {
          setDisplayedCount(prev => Math.min(prev + MODELS_PER_PAGE, searchResults.length));
        }
      },
      { threshold: 0.1 },
    );

    if (observerTargetRef.current) {
      observer.observe(observerTargetRef.current);
    }

    return () => {
      if (observerTargetRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(observerTargetRef.current);
      }
    };
  }, [displayedCount, searchResults.length]);

  const handleRefreshModels = async () => {
    await queryClient.invalidateQueries({ queryKey: MODELS_KEY });
    await refetch();
    toast.success("Models updated successfully");
  };

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

  useEffect(() => {
    if (!initializedRef.current)
      return;
    if (selectedModels.length === 0)
      return;
    if (JSON.stringify(selectedModels) === JSON.stringify(settings?.favoriteModels))
      return;

    const timeoutId = setTimeout(async () => {
      try {
        await updateFavoriteModels.mutateAsync(selectedModels);
      }
      catch (error) {
        console.error("Failed to save favorite models:", error);
        toast.error("Failed to save favorite models");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedModels, settings?.favoriteModels, updateFavoriteModels]);

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

  const selectedModelObjects = useMemo(() => {
    if (!selectedModels.length)
      return [];
    return selectedModels
      .map(modelId => models.find(m => m.id === modelId))
      .filter((m): m is Model => m !== undefined);
  }, [selectedModels, models]);

  const isRefreshing = isFetching && !isLoading;

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Models</h3>
        <p className="text-muted-foreground text-sm">
          Search and manage your favorite OpenRouter models (max 10)
        </p>
      </div>

      {/* Search Bar */}
      {models.length > 0 && (
        <div className="border-border border-b px-6 py-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
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
            <Button
              variant={filtersOpen ? "secondary" : "outline"}
              size="icon"
              className="relative shrink-0"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontalIcon className="size-4" />
              {activeFilterCount > 0 && (
                <span className={`
                  bg-primary text-primary-foreground absolute -top-1 -right-1
                  flex size-4 items-center justify-center rounded-full text-xs
                `}
                >
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
          {filtersOpen && (
            <div className={`
              mt-2 flex flex-wrap items-center justify-between gap-2
            `}
            >
              <div className="flex flex-row gap-2">
                <Button
                  variant={capabilityFilters.includes("image") ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleCapabilityFilter("image")}
                >
                  <ImageIcon className="size-3" />
                  Image
                </Button>
                <Button
                  variant={capabilityFilters.includes("pdf") ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleCapabilityFilter("pdf")}
                >
                  <FileTextIcon className="size-3" />
                  PDF
                </Button>
                <Button
                  variant={capabilityFilters.includes("search") ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleCapabilityFilter("search")}
                >
                  <SearchIcon className="size-3" />
                  Search
                </Button>
                <Button
                  variant={capabilityFilters.includes("reasoning") ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleCapabilityFilter("reasoning")}
                >
                  <BrainIcon className="size-3" />
                  Reasoning
                </Button>
              </div>
              <Select
                value={sortOrder}
                onValueChange={v => setSortOrder(v as SortOrder)}
              >
                <SelectTrigger className={`
                  w-48 gap-1 text-sm
                  data-[size=default]:h-8
                `}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="provider-asc">Provider (A-Z)</SelectItem>
                  <SelectItem value="provider-desc">Provider (Z-A)</SelectItem>
                  <SelectItem value="model-asc">Model (A-Z)</SelectItem>
                  <SelectItem value="model-desc">Model (Z-A)</SelectItem>
                  <SelectItem value="cost-asc">Output Cost (Low)</SelectItem>
                  <SelectItem value="cost-desc">Output Cost (High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="text-muted-foreground mt-2 text-xs">
            {`${searchResults.length} of ${models.length} models. `}
            <Button
              variant="link"
              size="sm"
              onClick={handleRefreshModels}
              className="-ml-2 h-min text-xs"
            >
              Refresh model list?
              <Loader2 className={cn(
                "size-3 transition-transform duration-500",
                isRefreshing ? "animate-spin" : "hidden",
              )}
              />
            </Button>
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
        {isLoading || isRefreshing
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
                      .slice(0, displayedCount)
                      .map((model) => {
                        const isSelected = selectedModels.includes(model.id);
                        return (<ModelCard key={model.id} model={model} isSelected={isSelected} toggleModel={toggleModel} />);
                      })}
                    {/* Intersection observer target for infinite scroll */}
                    <div ref={observerTargetRef} className="h-1" />
                    {displayedCount < searchResults.filter(m => !selectedModels.includes(m.id)).length && (
                      <div className="flex justify-center py-4">
                        <Loader2 className={`
                          text-muted-foreground size-5 animate-spin
                        `}
                        />
                      </div>
                    )}
                  </div>
                )}
      </div>
    </div>
  );
}
