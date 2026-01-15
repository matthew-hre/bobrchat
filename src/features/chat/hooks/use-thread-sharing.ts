"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createOrUpdateThreadShare, getThreadShareStatus, stopSharingThread } from "~/features/chat/actions";

export const THREAD_SHARE_KEY = (threadId: string) => ["thread-share", threadId] as const;

export type ThreadShareStatus = {
  shareId: string;
  shareUrl: string;
  showAttachments: boolean;
  isRevoked: boolean;
};

export function useThreadShareStatus(threadId: string | null) {
  return useQuery({
    queryKey: threadId ? THREAD_SHARE_KEY(threadId) : ["thread-share", null],
    queryFn: () => getThreadShareStatus(threadId!),
    enabled: !!threadId,
    staleTime: 30 * 1000,
  });
}

export function useCreateOrUpdateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, showAttachments }: { threadId: string; showAttachments: boolean }) =>
      createOrUpdateThreadShare(threadId, showAttachments),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: THREAD_SHARE_KEY(variables.threadId) });
    },
  });
}

export function useStopSharing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => stopSharingThread(threadId),
    onSuccess: (_data, threadId) => {
      queryClient.invalidateQueries({ queryKey: THREAD_SHARE_KEY(threadId) });
    },
  });
}
