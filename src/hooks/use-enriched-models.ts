import type { Model } from "@openrouter/sdk/models";

import { useMemo } from "react";

/**
 * Filters and enriches a list of models based on favorite model IDs
 * Memoized to avoid recalculating on every render
 */
export function useEnrichedModels(
  favoriteModelIds: string[] | undefined,
  allModels: Model[],
): Model[] {
  return useMemo(() => {
    if (!favoriteModelIds || favoriteModelIds.length === 0) {
      return [];
    }

    return favoriteModelIds
      .map(modelId => allModels.find(m => m.id === modelId))
      .filter((m): m is Model => m !== undefined);
  }, [favoriteModelIds, allModels]);
}
