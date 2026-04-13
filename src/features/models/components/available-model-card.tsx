"use client";

import { memo } from "react";

import { cn } from "~/lib/utils";

import type { ModelListItem } from "../types";

import { ModelCardContent } from "./model-card-content";

type AvailableModelCardProps = {
  model: ModelListItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
};

export const AvailableModelCard = memo(({
  model,
  isSelected,
  onToggle,
  disabled,
}: AvailableModelCardProps) => {
  return (
    <button
      onClick={() => onToggle(model.id)}
      disabled={disabled && !isSelected}
      className={cn(
        `
          hover:border-primary/50
          rounded-lg border p-4 text-left transition-all
        `,
        isSelected
          ? "border-primary/50 bg-primary/5"
          : `
            border-border
            hover:bg-card
          `,
        disabled && !isSelected && "cursor-not-allowed opacity-50",
      )}
    >
      <ModelCardContent
        model={model}
        trailingAction={(
          <div
            className={cn(
              `
                mt-0.5 flex size-5 shrink-0 items-center justify-center rounded
                border transition-all
              `,
              isSelected
                ? "border-primary bg-primary"
                : `
                  border-muted-foreground/30
                  hover:border-primary/50
                `,
            )}
          >
            {isSelected && (
              <div className="bg-primary-foreground size-2 rounded-[2px]" />
            )}
          </div>
        )}
      />
    </button>
  );
});
