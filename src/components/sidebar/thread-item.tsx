"use client";

import {
  Book,
  Code,
  FileText,
  Heart,
  Lightbulb,
  Loader2,
  MessageCircle,
  MessageSquare,
  Sparkles,
  Star,
  Trash2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useRef, useState } from "react";
import { toast } from "sonner";

import type { ThreadIcon } from "~/lib/db/schema/chat";

import { Button } from "~/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { useTags, useTagThread, useUntagThread } from "~/features/chat/hooks/use-tags";
import { useArchiveThread, useDeleteThread, useRegenerateThreadIcon, useRegenerateThreadName, useRenameThread, useThreadStats, useUpdateThreadIcon } from "~/features/chat/hooks/use-threads";
import { useChatUIStore } from "~/features/chat/store";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { THREAD_ICONS } from "~/lib/db/schema/chat";
import { cn } from "~/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const ICON_COMPONENTS = {
  "message-circle": MessageCircle,
  "message-square": MessageSquare,
  "sparkles": Sparkles,
  "lightbulb": Lightbulb,
  "code": Code,
  "book": Book,
  "file-text": FileText,
  "star": Star,
  "heart": Heart,
  "zap": Zap,
} as const satisfies Record<ThreadIcon, React.ComponentType<{ className?: string; fill?: string }>>;

const ICON_LABELS: Record<ThreadIcon, string> = {
  "message-circle": "Chat",
  "message-square": "Message",
  "sparkles": "Sparkles",
  "lightbulb": "Ideas",
  "code": "Code",
  "book": "Notes",
  "file-text": "Document",
  "star": "Starred",
  "heart": "Favorite",
  "zap": "Quick",
};

type ThreadItemProps = {
  id: string;
  title: string;
  icon?: ThreadIcon | null;
  isActive: boolean;
  isShared?: boolean;
  isArchived?: boolean;
  tags?: Array<{ id: string; name: string; color: string }>;
  onDeleteClick?: (threadId: string, threadTitle: string) => void;
  onShareClick?: (threadId: string, threadTitle: string) => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCost(cost: number): string {
  if (cost === 0)
    return "$0.00";
  return `$${cost.toFixed(6)}`;
}

function ThreadItemComponent({
  id,
  title,
  icon,
  isActive,
  isShared,
  isArchived,
  tags: threadTags,
  onDeleteClick,
  onShareClick,
}: ThreadItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const openrouterKey = useChatUIStore(state => state.openrouterKey);
  const isStreaming = useChatUIStore(state => state.streamingThreadId === id);
  const { data: settings } = useUserSettings();
  const sidebarIconsDisabled = settings?.showSidebarIcons ?? false;
  const deleteThreadMutation = useDeleteThread();
  const renameThreadMutation = useRenameThread();
  const regenerateThreadNameMutation = useRegenerateThreadName();
  const regenerateThreadIconMutation = useRegenerateThreadIcon();
  const updateIconMutation = useUpdateThreadIcon();
  const archiveThreadMutation = useArchiveThread();
  const { data: allTags } = useTags();
  const tagThreadMutation = useTagThread();
  const untagThreadMutation = useUntagThread();

  const currentIcon = icon ?? "message-circle";
  const IconComponent = ICON_COMPONENTS[currentIcon];

  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: stats, isLoading: statsLoading } = useThreadStats(menuOpen || tooltipOpen ? id : null);

  const performDirectDelete = async () => {
    try {
      await deleteThreadMutation.mutateAsync(id);
      toast.success("Thread deleted");
      // Only redirect to home if deleting the current thread
      const currentChatId = pathname.startsWith("/chat/")
        ? pathname.split("/chat/")[1]
        : null;
      if (currentChatId === id) {
        router.push("/");
      }
    }
    catch (error) {
      console.error("Failed to delete thread:", error);
      toast.error("Failed to delete thread");
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Control+Click = direct delete without dialog
    if (e.ctrlKey || e.metaKey) {
      performDirectDelete();
    }
    else {
      // Regular click = show dialog
      onDeleteClick?.(id, title);
    }
  };
  const handleRenameClick = () => {
    setIsRenaming(true);
    // Focus input after state update
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRegenerateNameClick = async () => {
    try {
      await regenerateThreadNameMutation.mutateAsync({ threadId: id, clientKey: openrouterKey ?? undefined, useAllMessages: true });
      toast.success("Thread name regenerated");
    }
    catch (error) {
      console.error("Failed to regenerate thread name:", error);
      toast.error("Failed to regenerate thread name");
    }
  };

  const handleRegenerateIconClick = async () => {
    try {
      await regenerateThreadIconMutation.mutateAsync({ threadId: id, clientKey: openrouterKey ?? undefined });
      toast.success("Thread icon regenerated");
    }
    catch (error) {
      console.error("Failed to regenerate thread icon:", error);
      toast.error("Failed to regenerate thread icon");
    }
  };

  const handleArchiveClick = async () => {
    try {
      await archiveThreadMutation.mutateAsync({ threadId: id, archive: !isArchived });
      toast.success(isArchived ? "Thread unarchived" : "Thread archived");
      if (!isArchived) {
        const currentChatId = pathname.startsWith("/chat/")
          ? pathname.split("/chat/")[1]
          : null;
        if (currentChatId === id) {
          router.push("/");
        }
      }
    }
    catch (error) {
      console.error("Failed to archive thread:", error);
      toast.error("Failed to archive thread");
    }
  };

  const isOverLimit = newTitle.length > 80;

  const handleRenameSubmit = async () => {
    if (isOverLimit) {
      return;
    }

    if (!newTitle.trim() || newTitle === title) {
      setIsRenaming(false);
      setNewTitle(title);
      return;
    }

    try {
      await renameThreadMutation.mutateAsync({ threadId: id, newTitle: newTitle.trim() });
      toast.success("Thread renamed");
    }
    catch (error) {
      console.error("Failed to rename thread:", error);
      toast.error("Failed to rename thread");
      setNewTitle(title);
    }
    finally {
      setIsRenaming(false);
    }
  };

  const handleInputBlur = () => {
    handleRenameSubmit();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    }
    else if (e.key === "Escape") {
      setIsRenaming(false);
      setNewTitle(title);
    }
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
        {!sidebarIconsDisabled && <IconComponent className="size-4 shrink-0" />}
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          disabled={renameThreadMutation.isPending}
          className={cn(
            `
              bg-sidebar-accent text-sidebar-accent-foreground flex-1 rounded
              px-1 py-0.5 text-sm outline-none
            `,
            "disabled:opacity-50",
            isOverLimit && "ring-destructive ring-2",
          )}
        />
      </div>
    );
  }

  return (
    <ContextMenu onOpenChange={setMenuOpen}>
      <ThreadTooltip title={title} isShared={isShared} tags={threadTags} stats={stats} statsLoading={statsLoading} onOpenChange={setTooltipOpen}>
        <ContextMenuTrigger>

          <div className="group/thread relative">
            <Link
              href={`/chat/${id}`}
              prefetch={false}
              className={cn(
                `
                  flex items-center gap-2 rounded-md px-2 py-1.5 text-sm
                  transition-colors
                `,
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-accent"
                  : "text-sidebar-foreground",
              )}
            >
              {!sidebarIconsDisabled && (
                regenerateThreadNameMutation.isPending || isStreaming
                  ? (
                      <Loader2 className="size-4 shrink-0 animate-spin" />
                    )
                  : (
                      <IconComponent
                        className={cn("size-4 shrink-0", isShared && `
                          text-primary
                        `)}
                      />
                    )
              )}
              <span className="flex-1 truncate pr-6">{title}</span>
              {threadTags && threadTags.length > 0 && (
                <span className={`
                  flex shrink-0 items-center gap-1 transition-opacity
                  group-hover/thread:opacity-0
                `}
                >
                  {threadTags.slice(0, 2).map(tag => (
                    <span
                      key={tag.id}
                      className="size-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                      title={tag.name}
                    />
                  ))}
                  {threadTags.length > 2 && (
                    <span className={`
                      text-muted-foreground text-[10px] leading-none
                    `}
                    >
                      +
                      {threadTags.length - 2}
                    </span>
                  )}
                </span>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className={
                `
                  absolute top-1 right-1 size-6 p-2 opacity-0 transition-opacity
                  group-hover/thread:opacity-100
                `
              }
              onClick={handleDeleteClick}
              disabled={deleteThreadMutation.isPending}
              title="Delete thread (Ctrl+Click to delete immediately)"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </ContextMenuTrigger>
      </ThreadTooltip>

      <ContextMenuContent>
        <ContextMenuItem onClick={handleRenameClick} disabled={regenerateThreadNameMutation.isPending}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={handleRegenerateNameClick} disabled={regenerateThreadNameMutation.isPending}>
          Regenerate Name
        </ContextMenuItem>
        {!sidebarIconsDisabled && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger disabled={updateIconMutation.isPending}>
                Change Icon
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="grid grid-cols-5 gap-1 p-2">
                {THREAD_ICONS.map((iconName) => {
                  const Icon = ICON_COMPONENTS[iconName];
                  const isSelected = iconName === currentIcon;
                  return (
                    <button
                      key={iconName}
                      onClick={() => {
                        updateIconMutation.mutate({ threadId: id, icon: iconName });
                      }}
                      title={ICON_LABELS[iconName]}
                      className={cn(
                        `
                          hover:bg-accent
                          flex size-8 items-center justify-center rounded-md
                          transition-colors
                        `,
                        isSelected && "bg-accent",
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem onClick={handleRegenerateIconClick} disabled={regenerateThreadIconMutation.isPending}>
              Regenerate Icon
            </ContextMenuItem>
          </>
        )}
        {allTags && allTags.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              Tags
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-[120px] p-1">
              {allTags.map((tag) => {
                const hasTag = threadTags?.some(t => t.id === tag.id) ?? false;
                return (
                  <ContextMenuItem
                    key={tag.id}
                    onClick={() => {
                      if (hasTag) {
                        untagThreadMutation.mutate({ threadId: id, tagId: tag.id });
                      }
                      else {
                        tagThreadMutation.mutate({ threadId: id, tagId: tag.id });
                      }
                    }}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1">{tag.name}</span>
                    {hasTag && <span className="text-primary ml-2 text-xs">✓</span>}
                  </ContextMenuItem>
                );
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuItem onClick={() => onShareClick?.(id, title)}>
          {isShared ? "Manage Share" : "Share"}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleArchiveClick} disabled={archiveThreadMutation.isPending}>
          {isArchived ? "Unarchive" : "Archive"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={handleDeleteClick}
          variant="destructive"
          disabled={deleteThreadMutation.isPending || regenerateThreadNameMutation.isPending}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

type ThreadTooltipProps = {
  title: string;
  isShared?: boolean;
  tags?: Array<{ id: string; name: string; color: string }>;
  stats?: { messageCount: number; attachmentCount: number; attachmentSize: number; totalCost: number } | null;
  statsLoading?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function ThreadTooltip({ title, isShared, tags, stats, statsLoading, onOpenChange, children }: ThreadTooltipProps) {
  return (
    <Tooltip delayDuration={1000} onOpenChange={onOpenChange}>
      <TooltipTrigger asChild>
        <div>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={-4}
        align="center"
        className="text-sm"
      >
        {title}
        {isShared && <span className="text-muted-foreground"> (shared)</span>}
        <div className="text-muted-foreground text-xs">
          {statsLoading
            ? "Loading..."
            : stats
              ? (
                  <>
                    {stats.messageCount}
                    {" "}
                    messages
                    {stats.attachmentCount > 0 && (
                      <>
                        {" · "}
                        {stats.attachmentCount}
                        {" "}
                        files (
                        {formatBytes(stats.attachmentSize)}
                        )
                      </>
                    )}
                    {stats.totalCost > 0 && (
                      <>
                        {" · "}
                        {formatCost(stats.totalCost)}
                      </>
                    )}
                  </>
                )
              : null}
        </div>
        {tags && tags.length > 0 && (
          <div className="mt-1 flex max-w-40 flex-wrap gap-1">
            {tags.map(tag => (
              <span
                key={tag.id}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                style={{
                  backgroundColor: `color-mix(in srgb, ${tag.color} 15%, transparent)`,
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export const ThreadItem = memo(ThreadItemComponent);
