"use client";

import type { ReactNode } from "react";

import { BrainIcon, FileTextIcon, ImageIcon, SearchIcon } from "lucide-react";

import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

import type { ModelListItem } from "../types";

import { formatModelName } from "../utils/format-model-name";
import { getModelListItemCapabilities } from "../utils/model-capabilities";
import { ProviderLogo } from "./provider-logo";

export function formatPrice(price: number | null): string {
  if (!price)
    return "Free";
  if (price < 0.000001)
    return "$0.000001/1M";
  return `$${(price * 1000000).toFixed(2)}/1M`;
}

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

type ModelCardContentProps = {
  model: ModelListItem;
  leadingAction?: ReactNode;
  trailingAction?: ReactNode;
};

export function ModelCardContent({
  model,
  leadingAction,
  trailingAction,
}: ModelCardContentProps) {
  const { data: settings } = useUserSettings();
  const capabilities = getModelListItemCapabilities(model);

  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        {leadingAction}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1">
            <ProviderLogo provider={model.provider} size="sm" />
            <h3 className="truncate text-sm leading-snug font-semibold">
              {formatModelName(model.name, settings?.hideModelProviderNames ?? false)}
            </h3>
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {model.id}
          </p>
        </div>
        {trailingAction}
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
    </>
  );
}
