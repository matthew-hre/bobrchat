"use client";

import type { InfiniteData } from "@tanstack/react-query";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { GroupedThreads, TagGroup } from "~/features/chat/utils/thread-grouper";
import type { ThreadIcon } from "~/lib/db/schema/chat";

import { archiveThread, deleteThread, fetchThreadStats, regenerateThreadIcon, regenerateThreadName, renameThread, setThreadIcon } from "~/features/chat/actions";
import { groupThreadsByDate, groupThreadsByTag } from "~/features/chat/utils/thread-grouper";
import { ARCHIVED_THREADS_KEY, THREADS_KEY } from "~/lib/queries/query-keys";

export { ARCHIVED_THREADS_KEY, THREADS_KEY };

export type ThreadFromApi = {
  id: string;
  title: string;
  icon: ThreadIcon | null;
  lastMessageAt: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  tags: Array<{ id: string; name: string; color: string }>;
};

type ThreadsResponse = {
  threads: ThreadFromApi[];
  nextCursor: string | null;
};

async function fetchThreads({ pageParam, archived, tagIds, search }: { pageParam: string | undefined; archived?: boolean; tagIds?: string[]; search?: string }): Promise<ThreadsResponse> {
  const params = new URLSearchParams({ limit: "50" });
  if (pageParam) {
    params.set("cursor", pageParam);
  }
  if (archived) {
    params.set("archived", "true");
  }
  if (tagIds && tagIds.length > 0) {
    params.set("tagIds", tagIds.join(","));
  }
  if (search) {
    params.set("search", search);
  }
  const response = await fetch(`/api/threads?${params.toString()}`);
  if (!response.ok)
    throw new Error("Failed to fetch threads");
  return response.json();
}

export function useThreads(options: { enabled?: boolean; archived?: boolean; tagIds?: string[]; search?: string } = {}) {
  const queryKey = options.search
    ? [...THREADS_KEY, "search", options.search]
    : options.tagIds?.length
      ? [...THREADS_KEY, "tagged", ...options.tagIds.slice().sort()]
      : options.archived ? ARCHIVED_THREADS_KEY : THREADS_KEY;

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchThreads({ pageParam, archived: options.archived, tagIds: options.tagIds, search: options.search }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
    enabled: options.enabled,
  });

  const allThreads = useMemo(() => {
    if (!query.data)
      return undefined;

    return query.data.pages.flatMap(page =>
      page.threads.map(t => ({
        ...t,
        lastMessageAt: t.lastMessageAt ? new Date(t.lastMessageAt) : null,
      })),
    );
  }, [query.data]);

  const groupedThreads: GroupedThreads | undefined = useMemo(() => {
    if (!allThreads)
      return undefined;
    return groupThreadsByDate(allThreads);
  }, [allThreads]);

  const tagGroups: TagGroup[] | undefined = useMemo(() => {
    if (!allThreads)
      return undefined;
    return groupThreadsByTag(allThreads);
  }, [allThreads]);

  return {
    ...query,
    data: groupedThreads,
    tagGroups,
  };
}

export function useThreadTitle(threadId: string, options: { initialThread?: ThreadFromApi | null } = {}): string | undefined {
  const { initialThread } = options;
  const initialData = initialThread
    ? {
        pages: [{ threads: [initialThread], nextCursor: null }],
        pageParams: [undefined],
      }
    : undefined;

  const { data } = useInfiniteQuery({
    queryKey: THREADS_KEY,
    queryFn: fetchThreads,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
    initialData,
    refetchOnMount: initialThread ? false : undefined,
    select: (data) => {
      const thread = data.pages.flatMap(p => p.threads).find(t => t.id === threadId);
      return thread?.title;
    },
  });

  return data;
}

export function useDeleteThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => deleteThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useRenameThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, newTitle }: { threadId: string; newTitle: string }) =>
      renameThread(threadId, newTitle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useRegenerateThreadName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, clientKey, useAllMessages }: { threadId: string; clientKey?: string; useAllMessages?: boolean }) =>
      regenerateThreadName(threadId, clientKey, useAllMessages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export type ThreadStats = {
  messageCount: number;
  attachmentCount: number;
  attachmentSize: number;
};

export function useThreadStats(threadId: string | null) {
  return useQuery({
    queryKey: ["thread-stats", threadId] as const,
    queryFn: () => fetchThreadStats(threadId!),
    enabled: !!threadId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateThreadIcon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, icon }: { threadId: string; icon: ThreadIcon }) =>
      setThreadIcon(threadId, icon),
    onMutate: async ({ threadId, icon }) => {
      await queryClient.cancelQueries({ queryKey: THREADS_KEY });

      const previous = queryClient.getQueryData<InfiniteData<ThreadsResponse>>(THREADS_KEY);

      queryClient.setQueryData<InfiniteData<ThreadsResponse>>(THREADS_KEY, (old) => {
        if (!old)
          return old;

        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            threads: page.threads.map(thread =>
              thread.id === threadId ? { ...thread, icon } : thread,
            ),
          })),
        };
      });

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(THREADS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useRegenerateThreadIcon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, clientKey }: { threadId: string; clientKey?: string }) =>
      regenerateThreadIcon(threadId, clientKey),
    onSuccess: (newIcon, { threadId }) => {
      queryClient.setQueryData<InfiniteData<ThreadsResponse>>(THREADS_KEY, (old) => {
        if (!old)
          return old;

        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            threads: page.threads.map(thread =>
              thread.id === threadId ? { ...thread, icon: newIcon } : thread,
            ),
          })),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useArchiveThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, archive }: { threadId: string; archive: boolean }) =>
      archiveThread(threadId, archive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
      queryClient.invalidateQueries({ queryKey: ARCHIVED_THREADS_KEY });
    },
  });
}
