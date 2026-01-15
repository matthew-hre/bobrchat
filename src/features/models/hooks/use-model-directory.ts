"use client";

import type { Model } from "@openrouter/sdk/models";

import Fuse from "fuse.js";
import { useMemo } from "react";

import type { CapabilityFilter, SortOrder } from "~/features/models/types";

import {
  filterByCapabilities,
  filterBySearch,
  sortModels,
} from "~/features/models/utils/model-filtering";
import {
  buildCapabilitiesMap,
  buildModelMetadataMap,
} from "~/features/models/utils/model-metadata";

type UseModelDirectoryOptions = {
  query: string;
  capabilityFilters: CapabilityFilter[];
  sortOrder: SortOrder;
};

type UseModelDirectoryResult = {
  results: Model[];
  totalCount: number;
};

export function useModelDirectory(
  models: Model[],
  options: UseModelDirectoryOptions,
): UseModelDirectoryResult {
  const { query, capabilityFilters, sortOrder } = options;

  const capsMap = useMemo(() => buildCapabilitiesMap(models), [models]);

  const metaMap = useMemo(() => buildModelMetadataMap(models), [models]);

  const fuse = useMemo(() => {
    if (!models.length)
      return null;

    return new Fuse(models, {
      keys: ["name"],
      threshold: 0.3,
      minMatchCharLength: 2,
      ignoreLocation: true,
      useExtendedSearch: true,
      sortFn: (a, b) => {
        const aItem = a as unknown as { item: Model };
        const bItem = b as unknown as { item: Model };

        const getNumericScore = (item: { item: Model } | undefined) => {
          if (!item)
            return 0;
          const combined = `${item.item.name} ${item.item.id}`.toLowerCase();
          const numbers = combined.match(/\d+(\.\d+)?/g) || [];
          return numbers.length;
        };

        const scoreA = getNumericScore(aItem);
        const scoreB = getNumericScore(bItem);

        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }

        return a.score - b.score;
      },
    });
  }, [models]);

  const results = useMemo(() => {
    let filtered = models;

    if (query.trim() && fuse) {
      filtered = filterBySearch(filtered, fuse, query);
    }

    filtered = filterByCapabilities(filtered, capsMap, capabilityFilters);

    return sortModels(filtered, metaMap, sortOrder);
  }, [models, query, fuse, capsMap, capabilityFilters, metaMap, sortOrder]);

  return {
    results,
    totalCount: models.length,
  };
}
