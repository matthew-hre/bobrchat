"use client";

import type { RefCallback } from "react";

import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import type { GroupedThreads } from "~/features/chat/utils/thread-grouper";
import type { ThreadIcon } from "~/lib/db/schema/chat";

import { Skeleton } from "~/components/ui/skeleton";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { DeleteThreadDialog } from "./delete-thread-dialog";
import { ShareThreadDialog } from "./share-thread-dialog";
import { ThreadItem } from "./thread-item";

type ThreadListProps = {
  groupedThreads?: GroupedThreads;
  flatResults?: Array<{ id: string; title: string; icon?: ThreadIcon | null }>;
  isSearching?: boolean;
  isArchived?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
};

export const ThreadList = memo(({
  groupedThreads,
  flatResults,
  isSearching,
  isArchived,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: ThreadListProps) => {
  const pathname = usePathname();
  const currentChatId = pathname.startsWith("/chat/")
    ? pathname.split("/chat/")[1]
    : null;
  const { isLoading: settingsLoading } = useUserSettings();

  const [threadToDelete, setThreadToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [threadToShare, setThreadToShare] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handleDeleteClick = useCallback((threadId: string, threadTitle: string) => {
    setThreadToDelete({ id: threadId, title: threadTitle });
  }, []);

  const handleShareClick = useCallback((threadId: string, threadTitle: string) => {
    setThreadToShare({ id: threadId, title: threadTitle });
  }, []);

  const [loadMoreEl, setLoadMoreEl] = useState<HTMLDivElement | null>(null);
  const loadMoreRef: RefCallback<HTMLDivElement> = useCallback((node) => {
    setLoadMoreEl(node);
  }, []);

  const isFetchingNextPageRef = useRef(!!isFetchingNextPage);
  useEffect(() => {
    isFetchingNextPageRef.current = !!isFetchingNextPage;
  }, [isFetchingNextPage]);

  useEffect(() => {
    if (!hasNextPage || !fetchNextPage)
      return;
    if (!loadMoreEl)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPageRef.current) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreEl);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, fetchNextPage, loadMoreEl]);

  const renderGroup = (
    title: string,
    threads: Array<{ id: string; title: string; icon?: ThreadIcon | null; isShared?: boolean }>,
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
              icon={thread.icon}
              isActive={currentChatId === thread.id}
              isShared={thread.isShared}
              isArchived={isArchived}
              onDeleteClick={handleDeleteClick}
              onShareClick={handleShareClick}
            />
          ))}
        </div>
      </div>
    );
  };

  if (settingsLoading) {
    return (
      <div className="space-y-4 py-2">
        <div className="space-y-1">
          <Skeleton className="mx-1 h-3 w-16" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  if (!groupedThreads && !isSearching) {
    return null;
  }

  return (
    <>
      {isSearching
        ? (
            <div className="space-y-1 py-2">
              {flatResults && flatResults.length > 0
                ? (
                    flatResults.map(thread => (
                      <ThreadItem
                        key={thread.id}
                        id={thread.id}
                        title={thread.title}
                        icon={thread.icon}
                        isActive={currentChatId === thread.id}
                        isArchived={isArchived}
                        onDeleteClick={handleDeleteClick}
                        onShareClick={handleShareClick}
                      />
                    ))
                  )
                : (
                    <p className={`
                      text-muted-foreground px-2 py-4 text-center text-sm
                    `}
                    >
                      No threads found
                    </p>
                  )}
            </div>
          )
        : (
            <div className="space-y-4 py-2">
              {renderGroup("Today", groupedThreads!.today)}
              {renderGroup("Last 7 Days", groupedThreads!.last7Days)}
              {renderGroup("Last 30 Days", groupedThreads!.last30Days)}
              {renderGroup("Older", groupedThreads!.older)}
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
      {threadToShare && (
        <ShareThreadDialog
          open={!!threadToShare}
          threadId={threadToShare.id}
          threadTitle={threadToShare.title}
          onOpenChange={(open) => {
            if (!open)
              setThreadToShare(null);
          }}
        />
      )}
    </>
  );
});

ThreadList.displayName = "ThreadList";
