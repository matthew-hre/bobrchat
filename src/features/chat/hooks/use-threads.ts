"use client";

import type { InfiniteData } from "@tanstack/react-query";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { GroupedThreads } from "~/features/chat/utils/thread-grouper";
import type { ThreadIcon } from "~/lib/db/schema/chat";

import { archiveThread, createNewThread, deleteThread, fetchThreadStats, regenerateThreadIcon, regenerateThreadName, renameThread, setThreadIcon } from "~/features/chat/actions";
import { groupThreadsByDate } from "~/features/chat/utils/thread-grouper";
import { SUBSCRIPTION_KEY } from "~/features/subscriptions/hooks/use-subscription";
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

type CreateThreadInput = {
  threadId: string;
  title?: string;
  icon?: ThreadIcon;
};

async function fetchThreads({ pageParam, archived, tagIds }: { pageParam: string | undefined; archived?: boolean; tagIds?: string[] }): Promise<ThreadsResponse> {
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
  const response = await fetch(`/api/threads?${params.toString()}`);
  if (!response.ok)
    throw new Error("Failed to fetch threads");
  return response.json();
}

export function useThreads(options: { enabled?: boolean; archived?: boolean; tagIds?: string[] } = {}) {
  const queryKey = options.tagIds?.length
    ? [...THREADS_KEY, "tagged", ...options.tagIds.slice().sort()]
    : options.archived ? ARCHIVED_THREADS_KEY : THREADS_KEY;

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchThreads({ pageParam, archived: options.archived, tagIds: options.tagIds }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
    enabled: options.enabled,
  });

  const groupedThreads: GroupedThreads | undefined = useMemo(() => {
    if (!query.data)
      return undefined;

    const allThreads = query.data.pages.flatMap(page =>
      page.threads.map(t => ({
        ...t,
        lastMessageAt: t.lastMessageAt ? new Date(t.lastMessageAt) : null,
      })),
    );
    return groupThreadsByDate(allThreads);
  }, [query.data]);

  return {
    ...query,
    data: groupedThreads,
  };
}

export type ThreadLimitError = {
  error: string;
  code: "THREAD_LIMIT_EXCEEDED";
  currentUsage: number;
  limit: number;
};

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateThreadInput) => {
      const result = await createNewThread({ threadId: input.threadId, title: input.title, icon: input.icon });
      if ("error" in result) {
        throw result;
      }
      return result.threadId;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: THREADS_KEY });

      const previous = queryClient.getQueryData<InfiniteData<ThreadsResponse>>(THREADS_KEY);

      const now = new Date().toISOString();
      const optimisticThread: ThreadFromApi = {
        id: input.threadId,
        title: input.title || "New Thread",
        icon: input.icon ?? null,
        lastMessageAt: now,
        userId: "",
        createdAt: now,
        updatedAt: now,
        isShared: false,
        tags: [],
      };

      queryClient.setQueryData<InfiniteData<ThreadsResponse>>(THREADS_KEY, (old) => {
        if (!old) {
          return {
            pages: [{ threads: [optimisticThread], nextCursor: null }],
            pageParams: [undefined],
          };
        }

        const [first, ...rest] = old.pages;
        const withoutDup = first.threads.filter(t => t.id !== input.threadId);

        return {
          ...old,
          pages: [{ ...first, threads: [optimisticThread, ...withoutDup] }, ...rest],
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
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    },
  });
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
