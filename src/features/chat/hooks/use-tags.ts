"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createUserTag, deleteUserTag, listUserTags, tagThread, untagThread, updateUserTag } from "~/features/chat/actions";
import { TAGS_KEY, THREADS_KEY } from "~/lib/queries/query-keys";

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export function useTags() {
  return useQuery({
    queryKey: TAGS_KEY,
    queryFn: () => listUserTags(),
    staleTime: 60 * 1000,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; color: string }) =>
      createUserTag(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => deleteUserTag(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, input }: { tagId: string; input: { name?: string; color?: string } }) =>
      updateUserTag(tagId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useTagThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, tagId }: { threadId: string; tagId: string }) =>
      tagThread(threadId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useUntagThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, tagId }: { threadId: string; tagId: string }) =>
      untagThread(threadId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}
