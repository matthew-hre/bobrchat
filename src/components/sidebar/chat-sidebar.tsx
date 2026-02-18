"use client";

import { ArchiveIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { Session } from "~/features/auth/lib/auth";

import { useKeyboardShortcutsContext } from "~/components/keyboard-shortcuts-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { useFilteredThreads } from "~/features/chat/hooks/use-filtered-threads";
import { useThreads } from "~/features/chat/hooks/use-threads";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { ThreadList } from "./thread-list";
import { UpgradeBanner } from "./upgrade-banner";
import { UserProfileCard } from "./user-profile-card";

function ThreadListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

function ThreadListContent({ searchQuery, showArchived }: { searchQuery: string; showArchived: boolean }) {
  const {
    data: groupedThreads,
    isLoading: threadsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useThreads({ archived: showArchived });

  const { groupedThreads: filteredGrouped, flatResults, isSearching } = useFilteredThreads(
    groupedThreads,
    searchQuery,
  );

  if (threadsLoading) {
    return <ThreadListSkeleton />;
  }

  if (isSearching) {
    return (
      <ThreadList
        flatResults={flatResults}
        isSearching
        isArchived={showArchived}
      />
    );
  }

  if (filteredGrouped) {
    return (
      <ThreadList
        groupedThreads={filteredGrouped}
        isArchived={showArchived}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    );
  }

  return null;
}

type ChatSidebarProps = {
  session: Session;
};

export function ChatSidebar({ session }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const { searchInputRef } = useKeyboardShortcutsContext();

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
              title="new thread"
              asChild
            >
              <Link href="/">
                <PlusIcon className="size-4" />
              </Link>
            </Button>
            <SidebarTrigger />
          </div>
        </div>
        <div className="flex items-center gap-1 px-3 pb-2">
          <div className="relative flex-1">
            <SearchIcon className={`
              text-muted-foreground pointer-events-none absolute top-1/2 left-2
              size-4 -translate-y-1/2
            `}
            />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={showArchived ? "Search archived..." : "Search threads..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 pr-8 pl-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-1 size-6 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <XIcon className="size-3" />
              </Button>
            )}
          </div>
          <Button
            variant={showArchived ? "secondary" : "ghost"}
            size="icon-sm"
            className="size-8 shrink-0"
            title={showArchived ? "Show active threads" : "Show archived threads"}
            onClick={() => {
              setShowArchived(prev => !prev);
              setSearchQuery("");
            }}
          >
            <ArchiveIcon className="size-4" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <ThreadListContent searchQuery={searchQuery} showArchived={showArchived} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-0">
        <UpgradeBanner />
        <UserProfileCard session={session} />
      </SidebarFooter>
    </Sidebar>
  );
}
