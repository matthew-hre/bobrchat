"use client";

import type { Model } from "@openrouter/sdk/models";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useFavoriteModels } from "~/features/models/hooks/use-models";
import {
  useUpdateFavoriteModels,
  useUserSettings,
} from "~/features/settings/hooks/use-user-settings";

const MAX_FAVORITES = 10;
const DEBOUNCE_MS = 500;

export function useFavoriteModelsDraft() {
  const { data: settings } = useUserSettings();
  const { models: favoriteModels } = useFavoriteModels();
  const { mutate: saveFavorites, isPending: isSaving } = useUpdateFavoriteModels();

  const [draftIds, setDraftIds] = useState<string[]>([]);
  const isDirtyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from committed settings when not dirty
  useEffect(() => {
    if (!isDirtyRef.current && settings?.favoriteModels) {
      setDraftIds(settings.favoriteModels);
    }
  }, [settings?.favoriteModels]);

  // Compute isDirty by comparing draft to committed
  const isDirty = useMemo(() => {
    const committed = settings?.favoriteModels ?? [];
    if (draftIds.length !== committed.length)
      return true;
    return draftIds.some((id, i) => id !== committed[i]);
  }, [draftIds, settings?.favoriteModels]);

  // Keep ref in sync
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Debounced save
  useEffect(() => {
    if (!isDirty)
      return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      saveFavorites(draftIds);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [draftIds, isDirty, saveFavorites]);

  const draftSet = useMemo(() => new Set(draftIds), [draftIds]);

  const draftModels = useMemo(() => {
    return draftIds
      .map(id => favoriteModels.find(m => m.id === id))
      .filter((m): m is Model => m !== undefined);
  }, [draftIds, favoriteModels]);

  const toggle = useCallback((modelId: string) => {
    setDraftIds((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length >= MAX_FAVORITES) {
        return prev;
      }
      return [...prev, modelId];
    });
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setDraftIds((prev) => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  return {
    draftIds,
    draftSet,
    draftModels,
    toggle,
    reorder,
    isSaving,
    isDirty,
  };
}
