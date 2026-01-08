"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { GroupedThreads } from "~/lib/utils/thread-grouper";

import { Skeleton } from "~/components/ui/skeleton";

import { DeleteThreadDialog } from "./delete-thread-dialog";
import { ThreadItem } from "./thread-item";

type ThreadListProps = {
  groupedThreads: GroupedThreads;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
};

export function ThreadList({
  groupedThreads,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: ThreadListProps) {
  const pathname = usePathname();
  const currentChatId = pathname.startsWith("/chat/")
    ? pathname.split("/chat/")[1]
    : null;

  const [threadToDelete, setThreadToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handleDeleteClick = useCallback((threadId: string, threadTitle: string) => {
    setThreadToDelete({ id: threadId, title: threadTitle });
  }, []);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || !fetchNextPage)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const el = loadMoreRef.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      if (el) {
        observer.unobserve(el);
      }
    };
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  const renderGroup = (
    title: string,
    threads: Array<{ id: string; title: string }>,
  ) => {
    if (threads.length === 0)
      return null;

    return (
      <div key={title} className="space-y-1">
        <h3 className={`
          text-sidebar-primary px-1 text-xs font-semibold tracking-wider
          uppercase
        `}
        >
          {title}
        </h3>
        <div className="space-y-0.5">
          {threads.map(thread => (
            <ThreadItem
              key={thread.id}
              id={thread.id}
              title={thread.title}
              isActive={currentChatId === thread.id}
              onDeleteClick={handleDeleteClick}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 py-2">
      {renderGroup("Today", groupedThreads.today)}
      {renderGroup("Last 7 Days", groupedThreads.last7Days)}
      {renderGroup("Last 30 Days", groupedThreads.last30Days)}
      {renderGroup("Older", groupedThreads.older)}

      {hasNextPage && (
        <div ref={loadMoreRef} className="px-1 py-2">
          {isFetchingNextPage && (
            <div className="space-y-1">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}
        </div>
      )}

      {threadToDelete && (
        <DeleteThreadDialog
          open={!!threadToDelete}
          threadId={threadToDelete.id}
          threadTitle={threadToDelete.title}
          onOpenChange={(open) => {
            if (!open)
              setThreadToDelete(null);
          }}
        />
      )}
    </div>
  );
}
