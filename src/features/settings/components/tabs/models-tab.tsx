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
import { useQueryClient } from "@tanstack/react-query";
import {
  BrainIcon,
  FileTextIcon,
  ImageIcon,
  Loader2,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { CapabilityFilter, SortOrder } from "~/features/models/types";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  ModelCard,
  MODELS_KEY,
  SortableFavoriteModel,
  useModels,
} from "~/features/models";
import { useModelDirectory } from "~/features/models/hooks/use-model-directory";
import { useFavoriteModelsDraft } from "~/features/settings/hooks/use-favorite-models-draft";
import { useInfiniteScroll } from "~/lib/hooks/use-infinite-scroll";
import { cn } from "~/lib/utils";

import { useApiKeyStatus } from "../../hooks/use-api-status";

export function ModelsTab() {
  const { hasKey: hasOpenRouterKey, isLoading: isKeyLoading } = useApiKeyStatus("openrouter");
  const { data: models = [], isLoading, isFetching, refetch } = useModels({ enabled: true });
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [capabilityFilters, setCapabilityFilters] = useState<CapabilityFilter[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("provider-asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  const { draftIds, draftSet, draftModels, toggle, reorder, isSaving } = useFavoriteModelsDraft();
  const { results: searchResults, totalCount } = useModelDirectory(models, {
    query: searchQuery,
    capabilityFilters,
    sortOrder,
  });

  const availableResults = searchResults.filter(m => !draftSet.has(m.id));
  const { displayedCount, observerRef, hasMore } = useInfiniteScroll({
    totalCount: availableResults.length,
    resetKeys: [searchQuery, capabilityFilters, sortOrder],
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const toggleCapabilityFilter = (filter: CapabilityFilter) => {
    setCapabilityFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter],
    );
  };

  const activeFilterCount = capabilityFilters.length + (sortOrder !== "provider-asc" ? 1 : 0);

  const handleRefreshModels = async () => {
    await queryClient.invalidateQueries({ queryKey: MODELS_KEY });
    await refetch();
    toast.success("Models updated successfully");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = draftIds.indexOf(active.id as string);
      const newIndex = draftIds.indexOf(over.id as string);
      reorder(oldIndex, newIndex);
    }
  };

  const isRefreshing = isFetching && !isLoading;

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">
          Models
          {isSaving && <Loader2 className="ml-2 inline size-4 animate-spin" />}
        </h3>
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
            {`${searchResults.length} of ${totalCount} models. `}
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
      {draftModels.length > 0 && (
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
                    {draftModels.length}
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
                    items={draftIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {draftModels.map(model => (
                      <SortableFavoriteModel
                        key={model.id}
                        model={model}
                        onRemove={() => toggle(model.id)}
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
                          <h3 className="mb-1 font-medium">No models loaded</h3>
                          <p className="text-muted-foreground mb-6 text-sm">
                            Loading available models from OpenRouter...
                          </p>
                        </>
                      )}
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
                    {availableResults
                      .slice(0, displayedCount)
                      .map((model) => {
                        const isSelected = draftSet.has(model.id);
                        return (<ModelCard key={model.id} model={model} isSelected={isSelected} toggleModel={toggle} />);
                      })}
                    {/* Intersection observer target for infinite scroll */}
                    <div ref={observerRef} className="h-1" />
                    {hasMore && (
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
