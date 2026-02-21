"use client";

import { CheckIcon, TagIcon } from "lucide-react";
import { useCallback, useEffect } from "react";

import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { useTags } from "~/features/chat/hooks/use-tags";
import { cn } from "~/lib/utils";

type TagsFilterPopoverProps = {
  selectedTagIds: string[];
  onSelectedTagIdsChange: (tagIds: string[]) => void;
};

export function TagsFilterPopover({ selectedTagIds, onSelectedTagIdsChange }: TagsFilterPopoverProps) {
  const { data: tags } = useTags();

  useEffect(() => {
    if (!tags) return;
    const validIds = selectedTagIds.filter(id => tags.some(t => t.id === id));
    if (validIds.length !== selectedTagIds.length) {
      onSelectedTagIdsChange(validIds);
    }
  }, [tags, selectedTagIds, onSelectedTagIdsChange]);

  const toggleTag = useCallback((tagId: string) => {
    onSelectedTagIdsChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter(id => id !== tagId)
        : [...selectedTagIds, tagId],
    );
  }, [selectedTagIds, onSelectedTagIdsChange]);

  const hasFilters = selectedTagIds.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasFilters ? "secondary" : "ghost"}
          size="icon-sm"
          className="size-6 shrink-0"
          title="Filter by tags"
        >
          <TagIcon className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {tags && tags.length > 0
          ? (
              <div className="space-y-0.5">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      `
                        hover:bg-accent
                        flex w-full items-center gap-2 rounded-sm px-2 py-1.5
                        text-sm transition-colors
                      `,
                      selectedTagIds.includes(tag.id) && "bg-accent/50",
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 truncate text-left">{tag.name}</span>
                    {selectedTagIds.includes(tag.id) && (
                      <CheckIcon className="text-primary size-3.5 shrink-0" />
                    )}
                  </button>
                ))}
                {hasFilters && (
                  <>
                    <div className="bg-border my-1 h-px" />
                    <button
                      onClick={() => onSelectedTagIdsChange([])}
                      className={`
                        text-muted-foreground flex w-full items-center
                        rounded-sm px-2 py-1.5 text-xs transition-colors
                        hover:bg-accent
                      `}
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            )
          : (
              <p className="text-muted-foreground py-3 text-center text-xs">
                No tags yet
              </p>
            )}
      </PopoverContent>
    </Popover>
  );
}
