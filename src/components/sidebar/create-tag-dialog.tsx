"use client";

import { CheckIcon, PaletteIcon, PencilIcon, PlusIcon, TagsIcon, Trash2Icon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { ColorPreset } from "~/components/ui/color-picker";

import { Button } from "~/components/ui/button";
import { ColorPicker, hueToOklch } from "~/components/ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from "~/features/chat/hooks/use-tags";

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

type CreateTagDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function TagRow({ tag }: { tag: { id: string; name: string; color: string } }) {
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();

  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [editColor, setEditColor] = useState<string | number>(tag.color);
  const [customHue, setCustomHue] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedEditColor = typeof editColor === "number"
    ? hueToOklch(customHue ?? editColor)
    : editColor;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const name = editName.trim();
    if (!name) {
      setEditName(tag.name);
      setIsEditing(false);
      return;
    }

    const hasChanges = name !== tag.name || resolvedEditColor !== tag.color;
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    try {
      await updateTagMutation.mutateAsync({
        tagId: tag.id,
        input: { name, color: resolvedEditColor },
      });
      toast.success("Tag updated");
      setIsEditing(false);
    }
    catch {
      toast.error("Failed to update tag");
    }
  };

  const handleCancel = () => {
    setEditName(tag.name);
    setEditColor(tag.color);
    setCustomHue(null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    try {
      await deleteTagMutation.mutateAsync(tag.id);
      toast.success("Tag deleted");
    }
    catch {
      toast.error("Failed to delete tag");
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border p-1.5">
        <Input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              handleSave();
            else if (e.key === "Escape")
              handleCancel();
          }}
          className="h-7 flex-1 text-xs"
          maxLength={32}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="size-7 shrink-0"
              style={{ borderColor: resolvedEditColor, color: resolvedEditColor }}
            >
              <PaletteIcon className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <ColorPicker
              presets={TAG_COLOR_PRESETS}
              value={editColor}
              onChange={(val) => {
                setEditColor(val);
                if (typeof val !== "number") {
                  setCustomHue(null);
                }
              }}
              customHue={customHue}
              onCustomHueChange={(hue) => {
                setCustomHue(hue);
                setEditColor(hue);
              }}
              onCustomHueCommit={(hue) => {
                setCustomHue(hue);
                setEditColor(hue);
              }}
              swatchSize="sm"
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 shrink-0"
          onClick={handleSave}
          disabled={updateTagMutation.isPending}
        >
          <CheckIcon className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 shrink-0"
          onClick={handleCancel}
        >
          <XIcon className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group/tag flex items-center gap-2 rounded-md py-1">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      <span className="flex-1 truncate text-sm">{tag.name}</span>
      <div className={`
        flex items-center gap-0.5 opacity-0 transition-opacity
        group-hover/tag:opacity-100
      `}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6"
          title="Rename tag"
          onClick={() => {
            setEditName(tag.name);
            setEditColor(tag.color);
            setCustomHue(null);
            setConfirmingDelete(false);
            setIsEditing(true);
          }}
        >
          <PencilIcon className="size-3" />
        </Button>
        {confirmingDelete
          ? (
              <Button
                variant="destructive"
                size="sm"
                className="animate-in fade-in zoom-in-95 h-6 px-2 text-xs"
                onClick={handleDelete}
                onBlur={() => setConfirmingDelete(false)}
                disabled={deleteTagMutation.isPending}
                autoFocus
              >
                <Trash2Icon className="size-3" />
                Confirm
              </Button>
            )
          : (
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                title="Delete tag"
                onClick={handleDelete}
                disabled={deleteTagMutation.isPending}
              >
                <Trash2Icon className="size-3" />
              </Button>
            )}
      </div>
    </div>
  );
}

export function CreateTagDialog({ open, onOpenChange }: CreateTagDialogProps) {
  const { data: tags } = useTags();
  const createTagMutation = useCreateTag();

  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | number>(TAG_COLOR_PRESETS[5].value);
  const [customHue, setCustomHue] = useState<number | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Create, rename, or delete tags to organize your threads.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`
                  ring-offset-background size-5 shrink-0 cursor-pointer
                  rounded-full border-2
                  focus-visible:ring-ring focus-visible:ring-2
                  focus-visible:ring-offset-2 focus-visible:outline-none
                `}
                style={{
                  backgroundColor: resolvedColor,
                  borderColor: resolvedColor,
                }}
                title="Pick color"
              />
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
          <Input
            type="text"
            placeholder="New tag name..."
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                handleCreateTag();
            }}
            className="h-8"
            maxLength={32}
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleCreateTag}
            disabled={!newTagName.trim() || createTagMutation.isPending}
          >
            <PlusIcon className="size-3.5" />
            Add
          </Button>
        </div>
        {tags && tags.length > 0
          ? (
              <>
                <Separator />
                <div className="-mx-1 max-h-52 space-y-0.5 overflow-y-auto px-1">
                  {tags.map(tag => (
                    <TagRow key={tag.id} tag={tag} />
                  ))}
                </div>
              </>
            )
          : (
              <div className="flex flex-col items-center gap-2 py-6">
                <TagsIcon className="text-muted-foreground/50 size-8" />
                <p className="text-muted-foreground text-sm">No tags yet</p>
                <p className="text-muted-foreground/70 text-xs">
                  Create your first tag above to start organizing threads.
                </p>
              </div>
            )}
      </DialogContent>
    </Dialog>
  );
}
