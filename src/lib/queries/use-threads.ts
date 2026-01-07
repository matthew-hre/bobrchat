"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GroupedThreads } from "~/lib/utils/thread-grouper";

import { groupThreadsByDate } from "~/lib/utils/thread-grouper";
import { createNewThread, deleteThread, renameThread } from "~/server/actions/chat";

export const THREADS_KEY = ["threads"] as const;

type ThreadFromApi = {
  id: string;
  title: string;
  lastMessageAt: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

async function fetchThreads(): Promise<ThreadFromApi[]> {
  const response = await fetch("/api/threads");
  if (!response.ok)
    throw new Error("Failed to fetch threads");
  return response.json();
}

export function useThreads(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: THREADS_KEY,
    queryFn: fetchThreads,
    staleTime: 30 * 1000, // 30 seconds
    enabled: options.enabled,
    select: (threads): GroupedThreads => {
      const parsed = threads.map(t => ({
        ...t,
        lastMessageAt: t.lastMessageAt ? new Date(t.lastMessageAt) : null,
      }));
      return groupThreadsByDate(parsed);
    },
  });
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
