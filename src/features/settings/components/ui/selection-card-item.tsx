"use client";

import { CheckIcon } from "lucide-react";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

type SelectionOption<T> = {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: typeof CheckIcon;
};

export function SelectionCardItem<T extends string | number>({
  label,
  description,
  options,
  value,
  onChange,
  layout = "grid",
  columns = 3,
  required = false,
  helperText,
  disabled = false,
  lockedMessage,
}: {
  label: string;
  description?: React.ReactNode;
  options: SelectionOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  layout?: "grid" | "flex";
  columns?: 2 | 3;
  required?: boolean;
  helperText?: React.ReactNode | ((selected: T | null) => React.ReactNode);
  disabled?: boolean;
  lockedMessage?: string;
}) {
  const isLocked = lockedMessage != null;
  const gridColsClass = columns === 2 ? "grid-cols-2" : "grid-cols-3";

  const renderHelperText = () => {
    if (!helperText) return null;
    if (typeof helperText === "function") {
      return helperText(value);
    }
    return helperText;
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
      <Label>
        {label}
        {required && !isLocked && (
          <span className="text-destructive -ml-1">*</span>
        )}
      </Label>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
      </div>

      {isLocked && value !== null ? (
        // Display-only locked state
        <div
          className={cn(`
            border-primary bg-primary/5 flex flex-col gap-1
            rounded-lg border p-3
          `)}
        >
          {(() => {
            const option = options.find(o => o.value === value);
            if (!option) return null;
            const Icon = option.icon;
            return (
              <>
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="size-4" />}
                  <span className="text-sm font-medium">
                    {option.label}
                  </span>
                  <CheckIcon
                    className={cn(`
                      bg-primary text-primary-foreground size-3
                      rounded-full p-0.5
                    `)}
                  />
                </div>
                {option.description && (
                  <span className="text-muted-foreground text-xs">
                    {option.description}
                  </span>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        // Selectable cards
        <div
          className={cn(
            layout === "grid"
              ? `grid ${gridColsClass} gap-2`
              : "flex gap-2",
          )}
        >
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = value === option.value;

            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => onChange(option.value)}
                disabled={disabled}
                className={cn(
                  `
                    flex flex-col items-start gap-1 rounded-lg
                    border p-3 text-left transition-colors
                  `,
                  layout === "flex" && "flex-1",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : cn(
                      "border-input",
                      !disabled && "cursor-pointer hover:bg-muted",
                    ),
                  disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="size-4" />}
                  <span className="text-sm font-medium">
                    {option.label}
                  </span>
                  {isSelected && (
                    <CheckIcon
                      className={cn(`
                        bg-primary text-primary-foreground size-3
                        rounded-full p-0.5
                      `)}
                    />
                  )}
                </div>
                {option.description && (
                  <span className="text-muted-foreground text-xs">
                    {option.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {renderHelperText() && (
        <p className="text-muted-foreground text-xs">{renderHelperText()}</p>
      )}
    </div>
  );
}
