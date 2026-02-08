import { dehydrate, QueryClient } from "@tanstack/react-query";

import { getThreadsByUserId } from "~/features/chat/queries";
import { THREADS_KEY } from "~/lib/queries/query-keys";

export async function prefetchThreads(userId: string) {
  const queryClient = new QueryClient();

  await queryClient.prefetchInfiniteQuery({
    queryKey: THREADS_KEY,
    queryFn: async ({ pageParam }) => {
      const result = await getThreadsByUserId(userId, {
        limit: 25,
        cursor: pageParam,
      });
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: { nextCursor: string | null }) =>
      lastPage.nextCursor ?? undefined,
    pages: 1,
  });

  return dehydrate(queryClient);
}
