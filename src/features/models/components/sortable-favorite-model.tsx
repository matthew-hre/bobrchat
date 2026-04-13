"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import type { ModelListItem } from "../types";

import { ModelCardContent } from "./model-card-content";

export function SortableFavoriteModel({
  model,
  onRemove,
}: {
  model: ModelListItem;
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
        "rounded-lg border p-4 text-left transition-all",
        isDragging
          ? "border-primary/30 bg-primary/5 shadow-md"
          : "border-primary/30 bg-primary/3",
      )}
    >
      <ModelCardContent
        model={model}
        leadingAction={(
          <button
            {...attributes}
            {...listeners}
            className={cn(
              `
                flex shrink-0 cursor-grab items-center justify-center rounded
                p-1 transition-colors
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
        )}
        trailingAction={(
          <button
            onClick={onRemove}
            className={`
              border-primary bg-primary mt-0.5 flex size-5 shrink-0 items-center
              justify-center rounded border transition-all
            `}
          >
            <div className="bg-primary-foreground size-2 rounded-[2px]" />
          </button>
        )}
      />
    </div>
  );
}
