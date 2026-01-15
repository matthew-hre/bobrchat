import type { Model } from "@openrouter/sdk/models";
import type Fuse from "fuse.js";

import type { CapabilityFilter, ModelCapabilities, SortOrder } from "../types";
import type { ModelMetadata } from "./model-metadata";

export function filterByCapabilities(
  models: Model[],
  capsMap: Map<string, ModelCapabilities>,
  filters: CapabilityFilter[],
): Model[] {
  if (filters.length === 0)
    return models;

  return models.filter((model) => {
    const caps = capsMap.get(model.id);
    if (!caps)
      return false;

    return filters.every((filter) => {
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

export function filterBySearch(
  models: Model[],
  fuse: Fuse<Model>,
  query: string,
): Model[] {
  const trimmed = query.trim();
  if (!trimmed)
    return models;

  return fuse.search(trimmed).map(result => result.item);
}

export function sortModels(
  models: Model[],
  metaMap: Map<string, ModelMetadata>,
  sortOrder: SortOrder,
): Model[] {
  const sorted = [...models];

  sorted.sort((a, b) => {
    const metaA = metaMap.get(a.id);
    const metaB = metaMap.get(b.id);

    switch (sortOrder) {
      case "provider-asc":
        return (metaA?.provider ?? "").localeCompare(metaB?.provider ?? "");
      case "provider-desc":
        return (metaB?.provider ?? "").localeCompare(metaA?.provider ?? "");
      case "model-asc":
        return (metaA?.name ?? "").localeCompare(metaB?.name ?? "");
      case "model-desc":
        return (metaB?.name ?? "").localeCompare(metaA?.name ?? "");
      case "cost-asc":
        return (
          Number(a.pricing?.prompt ?? 0) - Number(b.pricing?.prompt ?? 0)
        );
      case "cost-desc":
        return (
          Number(b.pricing?.prompt ?? 0) - Number(a.pricing?.prompt ?? 0)
        );
      default:
        return 0;
    }
  });

  return sorted;
}
