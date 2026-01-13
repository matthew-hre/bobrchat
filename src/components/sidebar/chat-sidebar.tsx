"use client";

import { PlusIcon, SearchIcon, XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { useSession } from "~/features/auth/lib/auth-client";
import { useFilteredThreads } from "~/features/chat/hooks/use-filtered-threads";
import { useThreads } from "~/features/chat/hooks/use-threads";
import { useApiKeyStatus } from "~/features/settings/hooks/use-api-status";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { ThreadList } from "./thread-list";
import { UserProfileCard } from "./user-profile-card";

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

function ThreadListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

function ThreadListContent({ searchQuery }: { searchQuery: string }) {
  const hydrated = useHydrated();
  const { data: session } = useSession();
  const {
    data: groupedThreads,
    isLoading: threadsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useThreads();

  const { groupedThreads: filteredGrouped, flatResults, isSearching } = useFilteredThreads(
    groupedThreads,
    searchQuery,
  );

  if (!hydrated) {
    return <ThreadListSkeleton />;
  }

  if (!session) {
    return null;
  }

  if (threadsLoading) {
    return <ThreadListSkeleton />;
  }

  if (isSearching) {
    return (
      <ThreadList
        flatResults={flatResults}
        isSearching
      />
    );
  }

  if (filteredGrouped) {
    return (
      <ThreadList
        groupedThreads={filteredGrouped}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    );
  }

  return null;
}

function UserProfileSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

function UserProfileContent() {
  const hydrated = useHydrated();
  const { data: session, isPending: sessionLoading } = useSession();

  const { hasKey: hasOpenRouterKey, isLoading: isOpenRouterLoading } = useApiKeyStatus("openrouter");
  const { hasKey: hasParallelKey, isLoading: isParallelLoading } = useApiKeyStatus("parallel");

  if (!hydrated || sessionLoading || isOpenRouterLoading || isParallelLoading) {
    return <UserProfileSkeleton />;
  }

  if (session) {
    return <UserProfileCard session={session} hasOpenRouterKey={hasOpenRouterKey} hasParallelKey={hasParallelKey} />;
  }

  return null;
}

export function ChatSidebar() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-0">
        <div className="flex h-14 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-row items-center gap-2">
              <Image
                src="/icon.png"
                alt="BobrChat Logo"
                width={64}
                height={64}
                className="size-8"
              />
              <span className="text-base font-semibold tracking-tight">
                BobrChat
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7"
              title="New chat"
              asChild
            >
              <Link href="/">
                <PlusIcon className="size-4" />
              </Link>
            </Button>
            <SidebarTrigger />
          </div>
        </div>
        <div className="relative px-3 pb-2">
          <SearchIcon className={`
            text-muted-foreground pointer-events-none absolute top-4 left-5
            size-4 -translate-y-1/2
          `}
          />
          <Input
            type="text"
            placeholder="Search threads..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 pr-8 pl-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-4 size-6 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <XIcon className="size-3" />
            </Button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <Suspense fallback={<ThreadListSkeleton />}>
            <ThreadListContent searchQuery={searchQuery} />
          </Suspense>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-0">
        <Suspense fallback={<UserProfileSkeleton />}>
          <UserProfileContent />
        </Suspense>
      </SidebarFooter>
    </Sidebar>
  );
}
