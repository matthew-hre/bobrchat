import { dehydrate, QueryClient } from "@tanstack/react-query";

import { getThreadsByUserId } from "~/features/chat/queries";
import { getModelsByIds } from "~/features/models/server/queries";
import { getUserSettings } from "~/features/settings/queries";
import { hasEncryptedKey } from "~/lib/api-keys/server";
import { MODELS_KEY, THREADS_KEY, USER_SETTINGS_KEY } from "~/lib/queries/query-keys";

export async function prefetchUserData(userId: string) {
  const queryClient = new QueryClient();

  // Start all independent fetches in parallel
  const settingsPromise = getUserSettings(userId);
  const hasOpenRouterPromise = hasEncryptedKey(userId, "openrouter");
  const hasParallelPromise = hasEncryptedKey(userId, "parallel");
  const threadsPromise = queryClient.prefetchInfiniteQuery({
    queryKey: THREADS_KEY,
    queryFn: async ({ pageParam }) => {
      return getThreadsByUserId(userId, {
        limit: 25,
        cursor: pageParam,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: { nextCursor: string | null }) =>
      lastPage.nextCursor ?? undefined,
    pages: 1,
  });

  // Wait for settings + API key status (needed to determine favorite IDs)
  const [settings, hasOpenRouter, hasParallel] = await Promise.all([
    settingsPromise,
    hasOpenRouterPromise,
    hasParallelPromise,
  ]);

  // Fetch favorite models (depends on settings) while threads continue
  const favoriteIds = settings.favoriteModels ?? [];
  const [favoriteModels] = await Promise.all([
    favoriteIds.length > 0 ? getModelsByIds(favoriteIds) : Promise.resolve([]),
    threadsPromise,
  ]);

  // Seed settings into query cache (matches syncUserSettings shape)
  queryClient.setQueryData(USER_SETTINGS_KEY, {
    ...settings,
    configuredApiKeys: {
      openrouter: hasOpenRouter,
      parallel: hasParallel,
    },
  });

  // Seed favorite models into query cache
  if (favoriteIds.length > 0 && favoriteModels.length > 0) {
    queryClient.setQueryData([...MODELS_KEY, "favorites", favoriteIds], favoriteModels);
  }

  return { dehydratedState: dehydrate(queryClient), settings };
}
