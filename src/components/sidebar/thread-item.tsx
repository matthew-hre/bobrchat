"use client";

import { Loader2, MessageCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { useDeleteThread, useRegenerateThreadName, useRenameThread, useThreadStats } from "~/features/chat/hooks/use-threads";
import { useChatUIStore } from "~/features/chat/store";
import { cn } from "~/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type ThreadItemProps = {
  id: string;
  title: string;
  isActive: boolean;
  onDeleteClick?: (threadId: string, threadTitle: string) => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ThreadItemComponent({
  id,
  title,
  isActive,
  onDeleteClick,
}: ThreadItemProps) {
  const router = useRouter();
  const openrouterKey = useChatUIStore(state => state.openrouterKey);
  const isStreaming = useChatUIStore(state => state.streamingThreadId === id);
  const deleteThreadMutation = useDeleteThread();
  const renameThreadMutation = useRenameThread();
  const regenerateThreadNameMutation = useRegenerateThreadName();

  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: stats, isLoading: statsLoading } = useThreadStats(menuOpen ? id : null);

  const performDirectDelete = async () => {
    try {
      await deleteThreadMutation.mutateAsync(id);
      toast.success("Thread deleted");
      router.push("/");
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
      await regenerateThreadNameMutation.mutateAsync({ threadId: id, clientKey: openrouterKey ?? undefined });
      toast.success("Thread name regenerated");
    }
    catch (error) {
      console.error("Failed to regenerate thread name:", error);
      toast.error("Failed to regenerate thread name");
    }
  };

  const handleRenameSubmit = async () => {
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
        <MessageCircle className="size-4 shrink-0" />
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
          )}
        />
      </div>
    );
  }

  return (
    <ContextMenu onOpenChange={setMenuOpen}>
      <ThreadTooltip title={title}>
        <ContextMenuTrigger>

          <div className="group/thread relative">
            <Link
              href={`/chat/${id}`}
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
              {regenerateThreadNameMutation.isPending || isStreaming
                ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                  )
                : (
                    <MessageCircle
                      className="size-4 shrink-0"
                      fill={isActive ? "currentColor" : "none"}
                    />
                  )}
              <span className="flex-1 truncate pr-6">{title}</span>
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
        <div className="text-muted-foreground px-2 py-1.5 text-xs">
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
                  </>
                )
              : "—"}
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleRenameClick} disabled={regenerateThreadNameMutation.isPending}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={handleRegenerateNameClick} disabled={regenerateThreadNameMutation.isPending}>
          Regenerate Name
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

function ThreadTooltip({ title, children}: { title: string; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={1000}>
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
      </TooltipContent>
    </Tooltip>
  );
}

export const ThreadItem = memo(ThreadItemComponent);
