"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { GroupedThreads } from "~/lib/utils/thread-grouper";

import { THREADS_KEY } from "~/lib/queries/query-keys";
import { groupThreadsByDate } from "~/lib/utils/thread-grouper";
import { createNewThread, deleteThread, regenerateThreadName, renameThread } from "~/server/actions/chat";

export { THREADS_KEY };

type ThreadFromApi = {
  id: string;
  title: string;
  lastMessageAt: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type ThreadsResponse = {
  threads: ThreadFromApi[];
  nextCursor: string | null;
};

async function fetchThreads({ pageParam }: { pageParam: string | undefined }): Promise<ThreadsResponse> {
  const params = new URLSearchParams({ limit: "50" });
  if (pageParam) {
    params.set("cursor", pageParam);
  }
  const response = await fetch(`/api/threads?${params.toString()}`);
  if (!response.ok)
    throw new Error("Failed to fetch threads");
  return response.json();
}

export function useThreads(options: { enabled?: boolean } = {}) {
  const query = useInfiniteQuery({
    queryKey: THREADS_KEY,
    queryFn: fetchThreads,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
    enabled: options.enabled,
  });

  const groupedThreads: GroupedThreads | undefined = query.data
    ? (() => {
        const allThreads = query.data.pages.flatMap(page =>
          page.threads.map(t => ({
            ...t,
            lastMessageAt: t.lastMessageAt ? new Date(t.lastMessageAt) : null,
          })),
        );
        return groupThreadsByDate(allThreads);
      })()
    : undefined;

  return {
    ...query,
    data: groupedThreads,
  };
}

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (defaultName?: string) => createNewThread(defaultName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
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
    mutationFn: ({ threadId, browserApiKey }: { threadId: string; browserApiKey?: string }) =>
      regenerateThreadName(threadId, browserApiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}
