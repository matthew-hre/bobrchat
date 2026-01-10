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
import { useDeleteThread, useRegenerateThreadName, useRenameThread } from "~/lib/queries/use-threads";
import { useChatUIStore } from "~/lib/stores/chat-ui-store";
import { cn } from "~/lib/utils";

type ThreadItemProps = {
  id: string;
  title: string;
  isActive: boolean;
  onDeleteClick?: (threadId: string, threadTitle: string) => void;
};

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
  const inputRef = useRef<HTMLInputElement>(null);

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
    <ContextMenu>
      <ContextMenuTrigger asChild>
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
      <ContextMenuContent>
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

export const ThreadItem = memo(ThreadItemComponent);
