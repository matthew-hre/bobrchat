"use client";

import {
  BrainIcon,
  FileTextIcon,
  ImageIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

import type { CapabilityFilter, SortOrder } from "~/features/models/types";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useDebouncedValue } from "~/lib/hooks/use-debounced-value";

type ModelsSearchBarProps = {
  onSearchChange: (search: string) => void;
  capabilityFilters: CapabilityFilter[];
  onCapabilityFiltersChange: (filters: CapabilityFilter[]) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  resultCount: number;
  totalCount: number;
  compact?: boolean;
};

export const ModelsSearchBar = memo(({
  onSearchChange,
  capabilityFilters,
  onCapabilityFiltersChange,
  sortOrder,
  onSortOrderChange,
  resultCount,
  totalCount,
  compact,
}: ModelsSearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const toggleCapabilityFilter = useCallback((filter: CapabilityFilter) => {
    onCapabilityFiltersChange(
      capabilityFilters.includes(filter)
        ? capabilityFilters.filter(f => f !== filter)
        : [...capabilityFilters, filter],
    );
  }, [capabilityFilters, onCapabilityFiltersChange]);

  const activeFilterCount = capabilityFilters.length + (sortOrder !== "provider-asc" ? 1 : 0);

  return (
    <div className={compact
      ? "border-border border-b px-4 py-2"
      : `border-border border-b px-6 py-3`}
    >
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
              bg-primary text-primary-foreground absolute -top-1 -right-1 flex
              size-4 items-center justify-center rounded-full text-xs
            `}
            >
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>
      {filtersOpen && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
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
            onValueChange={v => onSortOrderChange(v as SortOrder)}
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
      {!compact && (
        <p className="text-muted-foreground mt-2 text-xs">
          {`${resultCount} of ${totalCount} models`}
        </p>
      )}
    </div>
  );
});
