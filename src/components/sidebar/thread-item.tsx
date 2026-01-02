"use client";

import { MessageCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "~/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { cn } from "~/lib/utils";
import { deleteThread, renameThread } from "~/server/actions/chat";

type ThreadItemProps = {
  id: string;
  title: string;
  isActive: boolean;
  onDeleteClick?: (threadId: string, threadTitle: string) => void;
};

export function ThreadItem({
  id,
  title,
  isActive,
  onDeleteClick,
}: ThreadItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  const performDirectDelete = async () => {
    try {
      await deleteThread(id);
      router.push("/");
    }
    catch (error) {
      console.error("Failed to delete thread:", error);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Control+Click = direct delete without dialog
    if (e.ctrlKey || e.metaKey) {
      startTransition(performDirectDelete);
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

  const handleRenameSubmit = async () => {
    if (!newTitle.trim() || newTitle === title) {
      setIsRenaming(false);
      setNewTitle(title);
      return;
    }

    startTransition(async () => {
      try {
        await renameThread(id, newTitle.trim());
      }
      catch (error) {
        console.error("Failed to rename thread:", error);
        setNewTitle(title);
      }
      finally {
        setIsRenaming(false);
      }
    });
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
          disabled={isPending}
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
            <MessageCircle
              className="size-4 shrink-0"
              fill={isActive ? "currentColor" : "none"}
            />
            <span className="flex-1 truncate">{title}</span>
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
            disabled={isPending}
            title="Delete thread (Ctrl+Click to delete immediately)"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleRenameClick}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleDeleteClick}
          variant="destructive"
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
