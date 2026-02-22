"use client";

import { PaletteIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { ColorPreset } from "~/components/ui/color-picker";

import { Button } from "~/components/ui/button";
import { ColorPicker, hueToOklch } from "~/components/ui/color-picker";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { useCreateTag, useDeleteTag, useTags } from "~/features/chat/hooks/use-tags";

const TAG_COLOR_PRESETS: ColorPreset[] = [
  { value: "#ef4444", color: "#ef4444", label: "Red" },
  { value: "#f97316", color: "#f97316", label: "Orange" },
  { value: "#eab308", color: "#eab308", label: "Yellow" },
  { value: "#22c55e", color: "#22c55e", label: "Green" },
  { value: "#06b6d4", color: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", color: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", color: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", color: "#ec4899", label: "Pink" },
];

type TagManagerProps = {
  searchQuery?: string;
};

export function TagManager({ searchQuery = "" }: TagManagerProps) {
  const { data: tags, isLoading } = useTags();
  const createTagMutation = useCreateTag();
  const deleteTagMutation = useDeleteTag();

  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | number>(TAG_COLOR_PRESETS[5].value);
  const [customHue, setCustomHue] = useState<number | null>(null);

  const filteredTags = tags?.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const resolvedColor = typeof selectedColor === "number"
    ? hueToOklch(customHue ?? selectedColor)
    : selectedColor;

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name)
      return;

    try {
      await createTagMutation.mutateAsync({ name, color: resolvedColor });
      setNewTagName("");
      setSelectedColor(TAG_COLOR_PRESETS[5].value);
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
              style={{ borderColor: resolvedColor, color: resolvedColor }}
            >
              <PaletteIcon className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <ColorPicker
              presets={TAG_COLOR_PRESETS}
              value={selectedColor}
              onChange={(val) => {
                setSelectedColor(val);
                if (typeof val !== "number") {
                  setCustomHue(null);
                }
              }}
              customHue={customHue}
              onCustomHueChange={(hue) => {
                setCustomHue(hue);
                setSelectedColor(hue);
              }}
              onCustomHueCommit={(hue) => {
                setCustomHue(hue);
                setSelectedColor(hue);
              }}
              swatchSize="sm"
            />
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
                  }}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-foreground text-xs font-medium">{tag.name}</span>
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
