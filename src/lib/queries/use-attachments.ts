"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const ATTACHMENTS_KEY = ["attachments"] as const;

export type AttachmentTypeFilter = "all" | "image" | "pdf" | "text";
export type AttachmentOrder = "asc" | "desc";

export type AttachmentItem = {
  id: string;
  filename: string;
  mediaType: string;
  size: number;
  storagePath: string;
  url: string;
  createdAt: Date;
  isLinked: boolean;
};

type AttachmentsResponse = {
  items: Array<Omit<AttachmentItem, "createdAt"> & { createdAt: string }>;
  nextCursor?: string;
};

async function fetchAttachmentsPage(params: {
  type: AttachmentTypeFilter;
  order: AttachmentOrder;
  cursor?: string;
}): Promise<{ items: AttachmentItem[]; nextCursor?: string }> {
  const search = new URLSearchParams();
  search.set("type", params.type);
  search.set("order", params.order);
  if (params.cursor)
    search.set("cursor", params.cursor);

  const response = await fetch(`/api/attachments?${search.toString()}`);
  if (!response.ok)
    throw new Error("Failed to fetch attachments");

  const json = (await response.json()) as AttachmentsResponse;
  return {
    items: json.items.map(i => ({ ...i, createdAt: new Date(i.createdAt) })),
    nextCursor: json.nextCursor,
  };
}

export function useAttachmentsPage(params: {
  type: AttachmentTypeFilter;
  order: AttachmentOrder;
  cursor?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [...ATTACHMENTS_KEY, params.type, params.order, params.cursor ?? null] as const,
    queryFn: () => fetchAttachmentsPage({ type: params.type, order: params.order, cursor: params.cursor }),
    enabled: params.enabled,
    staleTime: 10 * 1000,
  });
}

async function deleteAttachments(ids: string[]): Promise<{ deleted: number }> {
  const response = await fetch("/api/attachments", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  if (!response.ok)
    throw new Error("Failed to delete attachments");

  return response.json();
}

export function useDeleteAttachments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteAttachments(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTACHMENTS_KEY });
    },
  });
}
