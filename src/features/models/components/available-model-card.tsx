"use client";

import { BrainIcon, FileTextIcon, ImageIcon, SearchIcon } from "lucide-react";
import { memo } from "react";

import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { cn } from "~/lib/utils";

import type { ModelListItem } from "../types";

import { getModelListItemCapabilities } from "../utils/model-capabilities";
import { formatModelName } from "../utils/format-model-name";
import { ProviderLogo } from "./provider-logo";

function formatPrice(price: number | null): string {
  if (!price)
    return "Free";
  if (price < 0.000001)
    return "$0.000001/1M";
  return `$${(price * 1000000).toFixed(2)}/1M`;
}

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
  const { data: settings } = useUserSettings();
  const capabilities = getModelListItemCapabilities(model);

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
          ? "border-primary bg-primary/5"
          : `
            border-border
            hover:bg-card
          `,
        disabled && !isSelected && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
         <div className="min-w-0 flex-1">
           <div className="flex items-center gap-1 mb-1">
             <ProviderLogo provider={model.provider} size="sm" />
             <h3 className="truncate text-sm leading-snug font-semibold">
               {formatModelName(model.name, settings?.hideModelProviderNames ?? false)}
             </h3>
           </div>
           <p className="text-muted-foreground truncate text-xs">
             {model.id}
           </p>
         </div>
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
      </div>

      <div className="flex gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">
            Input:
            {" "}
          </span>
          <span className="font-mono font-medium">
            {formatPrice(model.pricing?.prompt ?? null)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">
            Output:
            {" "}
          </span>
          <span className="font-mono font-medium">
            {formatPrice(model.pricing?.completion ?? null)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {capabilities.supportsImages && (
          <FeatureBadge icon={ImageIcon} label="Image Upload" />
        )}
        {capabilities.supportsPdf && (
          <FeatureBadge
            icon={FileTextIcon}
            label={capabilities.supportsNativePdf ? "PDF (Native)" : "PDF (OpenRouter)"}
          />
        )}
        {capabilities.supportsSearch && (
          <FeatureBadge icon={SearchIcon} label="Search" />
        )}
        {capabilities.supportsReasoning && (
          <FeatureBadge icon={BrainIcon} label="Reasoning" />
        )}
      </div>
    </button>
  );
});

function FeatureBadge({
  icon: Icon,
  label,
}: {
  icon: typeof FileTextIcon;
  label: string;
}) {
  return (
    <div className={`
      bg-muted mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1
      text-xs font-medium
    `}
    >
      <Icon className="size-3" />
      {label}
    </div>
  );
}
