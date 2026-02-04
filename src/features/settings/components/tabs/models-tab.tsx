"use client";

import type { DragEndEvent } from "@dnd-kit/core";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Loader2, SparklesIcon, StarIcon } from "lucide-react";
import { useCallback, useState } from "react";

import type { CapabilityFilter, SortOrder } from "~/features/models/types";

import { Skeleton } from "~/components/ui/skeleton";
import {
  AvailableModelCard,
  SortableFavoriteModel,
  useInfiniteModelsListQuery,
} from "~/features/models";
import { cn } from "~/lib/utils";

import { useApiKeyStatus } from "../../hooks/use-api-status";
import { useFavoriteModelsDraft } from "../../hooks/use-favorite-models-draft";
import { ModelsSearchBar } from "./models-search-bar";

type MobileTab = "available" | "favorites";

export function ModelsTab() {
  const { hasKey: hasOpenRouterKey, isLoading: isKeyLoading } = useApiKeyStatus("openrouter");

  const [searchQuery, setSearchQuery] = useState("");
  const [capabilityFilters, setCapabilityFilters] = useState<CapabilityFilter[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("provider-asc");
  const [mobileTab, setMobileTab] = useState<MobileTab>("available");

  const {
    models,
    total: totalCount,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteModelsListQuery({
    search: searchQuery || undefined,
    capabilities: capabilityFilters.length > 0 ? capabilityFilters : undefined,
    sortOrder,
    pageSize: 50,
  });

  const {
    draftIds,
    draftSet,
    draftModels,
    toggle,
    reorder,
    isSaving,
    canAddMore,
    maxFavorites,
  } = useFavoriteModelsDraft();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleSearchChange = useCallback((search: string) => {
    setSearchQuery(search);
  }, []);

  const handleCapabilityFiltersChange = useCallback((filters: CapabilityFilter[]) => {
    setCapabilityFilters(filters);
  }, []);

  const handleSortOrderChange = useCallback((order: SortOrder) => {
    setSortOrder(order);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id)
      return;

    const oldIndex = draftIds.indexOf(active.id as string);
    const newIndex = draftIds.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorder(oldIndex, newIndex);
    }
  }, [draftIds, reorder]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    if (scrollBottom < 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderAllModels = () => {
    if (isLoading) {
      return (
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
      );
    }

    if (models.length === 0) {
      return (
        <div className={`
          flex flex-col items-center justify-center py-12 text-center
        `}
        >
          <div className="bg-muted mb-4 rounded-full p-3">
            <SparklesIcon className="text-muted-foreground size-6" />
          </div>
          {!isKeyLoading && !hasOpenRouterKey
            ? (
                <>
                  <h3 className="mb-1 font-medium">No API key configured</h3>
                  <p className="text-muted-foreground mb-6 text-sm">
                    Add your OpenRouter API key in the Integrations tab to browse available models.
                  </p>
                </>
              )
            : (
                <>
                  <h3 className="mb-1 font-medium">No models found</h3>
                  <p className="text-muted-foreground mb-6 text-sm">
                    No models are available. They will be synced automatically.
                  </p>
                </>
              )}
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {models.map((model) => {
          const isSelected = draftSet.has(model.id);
          return (
            <AvailableModelCard
              key={model.id}
              model={model}
              isSelected={isSelected}
              onToggle={toggle}
              disabled={!canAddMore}
            />
          );
        })}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        )}
      </div>
    );
  };

  const renderFavoriteModels = () => {
    if (draftModels.length === 0) {
      return (
        <div className={`
          flex flex-col items-center justify-center py-12 text-center
        `}
        >
          <div className="bg-muted mb-4 rounded-full p-3">
            <StarIcon className="text-muted-foreground size-6" />
          </div>
          <h3 className="mb-1 font-medium">No favorite models</h3>
          <p className="text-muted-foreground text-sm">
            Select models from the left to add them here.
          </p>
        </div>
      );
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={draftIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-3">
            {draftModels.map(model => (
              <SortableFavoriteModel
                key={model.id}
                model={model}
                onRemove={() => toggle(model.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b p-6">
        <h3 className="text-lg font-semibold">
          Models
          {isSaving && <Loader2 className="ml-2 inline size-4 animate-spin" />}
        </h3>
        <p className="text-muted-foreground text-sm">
          Search and manage your favorite OpenRouter models (max
          {" "}
          {maxFavorites}
          )
        </p>
      </div>

      {/* Search Bar - spans full width */}
      {hasOpenRouterKey && (
        <ModelsSearchBar
          onSearchChange={handleSearchChange}
          capabilityFilters={capabilityFilters}
          onCapabilityFiltersChange={handleCapabilityFiltersChange}
          sortOrder={sortOrder}
          onSortOrderChange={handleSortOrderChange}
          resultCount={models.length}
          totalCount={totalCount}
        />
      )}

      {/* Mobile Tab Switcher */}
      <div className={`
        border-b p-2
        md:hidden
      `}
      >
        <div className="bg-muted flex gap-1 rounded-lg p-1">
          <button
            onClick={() => setMobileTab("available")}
            className={cn(
              `
                flex-1 rounded-md px-3 py-2 text-sm font-medium
                transition-colors
              `,
              mobileTab === "available"
                ? "bg-background text-foreground shadow-sm"
                : `
                  text-muted-foreground
                  hover:text-foreground
                `,
            )}
          >
            All Models
          </button>
          <button
            onClick={() => setMobileTab("favorites")}
            className={cn(
              `
                flex-1 rounded-md px-3 py-2 text-sm font-medium
                transition-colors
              `,
              mobileTab === "favorites"
                ? "bg-background text-foreground shadow-sm"
                : `
                  text-muted-foreground
                  hover:text-foreground
                `,
            )}
          >
            Favorites
            {draftModels.length > 0 && (
              <span className="ml-1.5 text-xs">
                (
                {draftModels.length}
                )
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Two-Column Layout */}
      <div className={`
        hidden min-h-0 flex-1
        md:flex
      `}
      >
        {/* Left Column - All Models */}
        <div className="flex w-1/2 flex-col border-r">
          <div className="shrink-0 border-b px-4 py-3">
            <h4 className="text-sm font-medium">All Models</h4>
            <p className="text-muted-foreground text-xs">
              {models.length}
              {" "}
              of
              {" "}
              {totalCount}
              {" "}
              models
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
            {renderAllModels()}
          </div>
        </div>

        {/* Right Column - Favorite Models */}
        <div className="flex w-1/2 flex-col">
          <div className="shrink-0 border-b px-4 py-3">
            <h4 className="text-sm font-medium">Favorite Models</h4>
            <p className="text-muted-foreground text-xs">
              {draftModels.length}
              /
              {maxFavorites}
              {" "}
              selected · drag to reorder
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {renderFavoriteModels()}
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className={`
        flex min-h-0 flex-1 flex-col
        md:hidden
      `}
      >
        {mobileTab === "available" && (
          <div className="flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
            {renderAllModels()}
          </div>
        )}
        {mobileTab === "favorites" && (
          <div className="flex-1 overflow-y-auto p-4">
            {renderFavoriteModels()}
          </div>
        )}
      </div>
    </div>
  );
}
