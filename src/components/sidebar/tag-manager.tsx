"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useCreateTag, useDeleteTag, useTags } from "~/features/chat/hooks/use-tags";
import { cn } from "~/lib/utils";

const TAG_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

type TagManagerProps = {
  searchQuery?: string;
};

export function TagManager({ searchQuery = "" }: TagManagerProps) {
  const { data: tags, isLoading } = useTags();
  const createTagMutation = useCreateTag();
  const deleteTagMutation = useDeleteTag();

  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[5]);

  const filteredTags = tags?.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name)
      return;

    try {
      await createTagMutation.mutateAsync({ name, color: selectedColor });
      setNewTagName("");
      toast.success("Tag created");
    }
    catch {
      toast.error("Failed to create tag");
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTagMutation.mutateAsync(tagId);
      toast.success("Tag deleted");
    }
    catch {
      toast.error("Failed to delete tag");
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground px-2 py-4 text-center text-sm">
        Loading tags...
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      <div className="space-y-2 px-1">
        <div className="flex items-center gap-1">
          <Input
            type="text"
            placeholder="New tag name..."
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                handleCreateTag();
            }}
            className="h-7 text-xs"
            maxLength={32}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            onClick={handleCreateTag}
            disabled={!newTagName.trim() || createTagMutation.isPending}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
        <div className="flex gap-1">
          {TAG_COLORS.map(color => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={cn(
                "size-4 rounded-full transition-all",
                selectedColor === color && "ring-ring ring-2 ring-offset-1",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      {filteredTags && filteredTags.length > 0
        ? (
            <div className="space-y-1 px-1">
              {filteredTags.map(tag => (
                <div
                  key={tag.id}
                  className={`
                    group/tag flex items-center justify-between rounded-md px-2
                    py-1
                  `}
                >
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: tag.color, color: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={`
                      size-5 opacity-0 transition-opacity
                      group-hover/tag:opacity-100
                    `}
                    onClick={() => handleDeleteTag(tag.id)}
                    disabled={deleteTagMutation.isPending}
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )
        : (
            <p className="text-muted-foreground px-2 text-center text-xs">
              {searchQuery ? "No matching tags" : "No tags yet"}
            </p>
          )}
    </div>
  );
}
