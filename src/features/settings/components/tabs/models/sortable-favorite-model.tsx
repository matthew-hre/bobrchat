import type { Model } from "@openrouter/sdk/models";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function SortableFavoriteModel({
  model,
  onRemove,
}: {
  model: Model;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: model.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        `
          flex items-center justify-between rounded-lg border p-3 text-xs
          transition-all
        `,
        isDragging
          ? "border-primary/50 bg-primary/10 shadow-md"
          : "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className={cn(
            `
              flex cursor-grab items-center justify-center rounded p-1
              transition-colors
              active:cursor-grabbing
            `,
            isDragging
              ? "bg-primary/20 text-primary"
              : `
                text-muted-foreground
                hover:text-foreground
              `,
          )}
          type="button"
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <div className="flex flex-col items-start">
          <span className="font-medium">{model.name}</span>
          <span className="text-muted-foreground text-[10px]">
            {model.id}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="ml-2 p-0"
        onClick={onRemove}
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  );
}
