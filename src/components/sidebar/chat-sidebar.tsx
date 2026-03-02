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
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useTags } from "~/features/chat/hooks/use-tags";
import { useThreads } from "~/features/chat/hooks/use-threads";

import { useDebouncedValue } from "~/lib/hooks";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { TagsFilterPopover } from "./tags-filter-popover";
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

type ViewMode = "recents" | "tags";

function ThreadListContent({ searchQuery, showArchived, selectedTagIds, viewMode }: { searchQuery: string; showArchived: boolean; selectedTagIds: string[]; viewMode: ViewMode }) {
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);
  const isSearching = debouncedSearch.length > 0;

  const {
    data: groupedThreads,
    tagGroups,
    isLoading: threadsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useThreads({
    archived: showArchived,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    search: isSearching ? debouncedSearch : undefined,
  });

  if (threadsLoading) {
    return <ThreadListSkeleton />;
  }

  if (isSearching && groupedThreads) {
    const flatResults = [
      ...groupedThreads.today,
      ...groupedThreads.last7Days,
      ...groupedThreads.last30Days,
      ...groupedThreads.older,
    ];

    return (
      <ThreadList
        flatResults={flatResults}
        isSearching
        isArchived={showArchived}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    );
  }

  if (viewMode === "tags" && tagGroups) {
    return (
      <ThreadList
        tagGroups={tagGroups}
        isArchived={showArchived}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    );
  }

  if (groupedThreads) {
    return (
      <ThreadList
        groupedThreads={groupedThreads}
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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("recents");
  const { searchInputRef } = useKeyboardShortcutsContext();
  const { data: tags } = useTags();

  const hasTags = tags && tags.length > 0;

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
        <div className="flex items-center gap-1 px-3 pb-1">
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
              className="h-8 pr-[4.5rem] pl-8"
            />
            <div className={`
              absolute top-1/2 right-1 flex -translate-y-1/2 items-center
              gap-0.5
            `}
            >
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                  onClick={() => setSearchQuery("")}
                >
                  <XIcon className="size-3" />
                </Button>
              )}
              <TagsFilterPopover
                selectedTagIds={selectedTagIds}
                onSelectedTagIdsChange={setSelectedTagIds}
              />
              <Button
                variant={showArchived ? "secondary" : "ghost"}
                size="icon-sm"
                className="size-6 shrink-0"
                title={showArchived ? "Show active threads" : "Show archived threads"}
                onClick={() => {
                  setShowArchived(prev => !prev);
                  setSearchQuery("");
                }}
              >
                <ArchiveIcon className="size-3" />
              </Button>
            </div>
          </div>
        </div>
        {hasTags && (
          <div className="px-3 pb-1">
            <Tabs
              value={viewMode}
              onValueChange={v => setViewMode(v as ViewMode)}
            >
              <TabsList className="h-8 w-full">
                <TabsTrigger value="recents" className="flex-1 text-xs">
                  Recents
                </TabsTrigger>
                <TabsTrigger value="tags" className="flex-1 text-xs">
                  Tags
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <ThreadListContent
            searchQuery={searchQuery}
            showArchived={showArchived}
            selectedTagIds={selectedTagIds}
            viewMode={hasTags ? viewMode : "recents"}
          />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-0">
        <UpgradeBanner />
        <UserProfileCard session={session} />
      </SidebarFooter>
    </Sidebar>
  );
}
