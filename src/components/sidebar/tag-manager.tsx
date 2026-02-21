"use client";

import { PaletteIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
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
  const [customHue, setCustomHue] = useState<number | null>(null);
  const [isCustomColor, setIsCustomColor] = useState(false);

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
      setSelectedColor(TAG_COLORS[5]);
      setIsCustomColor(false);
      setCustomHue(null);
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

  const handleSelectPreset = (color: string) => {
    setSelectedColor(color);
    setIsCustomColor(false);
    setCustomHue(null);
  };

  const handleSelectCustom = () => {
    setIsCustomColor(true);
    const hue = customHue ?? 200;
    setCustomHue(hue);
    setSelectedColor(`oklch(0.72 0.19 ${hue})`);
  };

  const handleHueChange = (hue: number) => {
    setCustomHue(hue);
    setSelectedColor(`oklch(0.72 0.19 ${hue})`);
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
      <div className="flex items-center gap-1.5 px-1">
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
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="size-7 shrink-0"
              style={{ borderColor: selectedColor, color: selectedColor }}
            >
              <PaletteIcon className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleSelectPreset(color)}
                    className={cn(
                      `
                        h-7 w-7 rounded-full border-2 transition-all
                        hover:scale-110
                      `,
                      selectedColor === color && !isCustomColor
                        ? `
                          border-foreground ring-foreground
                          ring-offset-background ring-2 ring-offset-2
                        `
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <button
                  type="button"
                  onClick={handleSelectCustom}
                  className={cn(
                    `
                      flex h-7 w-7 items-center justify-center rounded-full
                      border border-dashed transition-all
                      hover:scale-110
                    `,
                    isCustomColor
                      ? `
                        border-foreground ring-foreground ring-offset-background
                        ring-2 ring-offset-2
                      `
                      : "border-muted-foreground",
                  )}
                  title="Custom"
                  aria-label="Custom color"
                >
                  <PaletteIcon className="text-muted-foreground h-3.5 w-3.5" />
                </button>
              </div>
              {isCustomColor && customHue !== null && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 shrink-0 rounded-full border"
                    style={{ backgroundColor: `oklch(0.72 0.19 ${customHue})` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={customHue}
                    onChange={e => handleHueChange(Number(e.target.value))}
                    className={`
                      h-2 w-full cursor-pointer appearance-none rounded-full
                    `}
                    style={{
                      background: "linear-gradient(to right, oklch(0.72 0.19 0), oklch(0.72 0.19 60), oklch(0.72 0.19 120), oklch(0.72 0.19 180), oklch(0.72 0.19 240), oklch(0.72 0.19 300), oklch(0.72 0.19 360))",
                    }}
                  />
                  <span className="text-muted-foreground w-8 text-xs">
                    {customHue}
                    °
                  </span>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="icon-sm"
          className="size-7 shrink-0"
          onClick={handleCreateTag}
          disabled={!newTagName.trim() || createTagMutation.isPending}
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>
      {filteredTags && filteredTags.length > 0
        ? (
            <div className="space-y-1 px-1">
              {filteredTags.map(tag => (
                <div
                  key={tag.id}
                  className={`
                    group/tag flex items-center justify-between rounded-md px-2
                    py-1.5
                  `}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${tag.color} 15%, transparent)`,
                    color: tag.color,
                  }}
                >
                  <span className="text-xs font-medium">{tag.name}</span>
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
