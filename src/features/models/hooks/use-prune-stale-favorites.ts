"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { pruneStaleModelIds } from "~/features/settings/actions";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { USER_SETTINGS_KEY } from "~/lib/queries/query-keys";

import { useFavoriteModelsForList } from "./use-models";

/**
 * Detects favorite model IDs that no longer exist in the models table
 * and prunes them from user settings, showing a toast notification.
 * Runs at most once per mount.
 */
export function usePruneStaleFavorites() {
  const { data: settings } = useUserSettings();
  const { models: resolvedModels, isLoading } = useFavoriteModelsForList();
  const queryClient = useQueryClient();
  const hasPrunedRef = useRef(false);

  useEffect(() => {
    if (hasPrunedRef.current || isLoading)
      return;

    const favoriteIds = settings?.favoriteModels ?? [];
    if (favoriteIds.length === 0)
      return;

    // Wait until models have resolved
    if (resolvedModels.length === 0 && favoriteIds.length > 0)
      return;

    const resolvedSet = new Set(resolvedModels.map(m => m.id));
    const staleIds = favoriteIds.filter(id => !resolvedSet.has(id));

    if (staleIds.length === 0)
      return;

    hasPrunedRef.current = true;

    pruneStaleModelIds().then((removedIds) => {
      if (removedIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
        toast.info(
          `${removedIds.length} model${removedIds.length === 1 ? "" : "s"} removed from your favorites because ${removedIds.length === 1 ? "it's" : "they're"} no longer available`,
        );
      }
    }).catch(() => {
      // Silently fail — pruning is best-effort
    });
  }, [settings?.favoriteModels, resolvedModels, isLoading, queryClient]);
}
