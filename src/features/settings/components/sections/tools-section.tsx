"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { PreferencesUpdate, ToolModelId, UserSettingsData } from "~/features/settings/types";

import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { TOOL_MODEL_OPTIONS } from "~/features/chat/server/providers/types";
import { useChatUIStore } from "~/features/chat/store";
import { getToolModelPricing } from "~/features/settings/actions";
import { useUpdatePreferences } from "~/features/settings/hooks/use-user-settings";

import { SettingsSection } from "../ui/settings-section";
import { ToggleItem } from "../ui/toggle-item";

type ToolsSectionProps = {
  settings: UserSettingsData;
};

function formatPrice(costPerToken: number | null | undefined): string | null {
  if (costPerToken == null)
    return null;
  const perMillion = costPerToken * 1_000_000;
  if (perMillion < 0.01)
    return "< $0.01/M";
  return `$${perMillion.toFixed(2)}/M`;
}

function ToolModelSelect({
  label,
  description,
  value,
  onChange,
  availableProviders,
  pricing,
}: {
  label: string;
  description: string;
  value: ToolModelId;
  onChange: (value: ToolModelId) => void;
  availableProviders: Set<string>;
  pricing: Record<string, number | null>;
}) {
  const filteredOptions = useMemo(
    () => TOOL_MODEL_OPTIONS.filter(o => o.providers.some(p => availableProviders.has(p))),
    [availableProviders],
  );

  const optionMap = Object.fromEntries(TOOL_MODEL_OPTIONS.map(o => [o.id, o]));

  // If current value isn't available, show first available option
  const effectiveValue = filteredOptions.some(o => o.id === value)
    ? value
    : filteredOptions[0]?.id ?? value;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <Select
        value={effectiveValue}
        onValueChange={v => onChange(v as ToolModelId)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {filteredOptions.map((option) => {
            const price = formatPrice(pricing[option.id]);
            return (
              <SelectItem key={option.id} value={option.id}>
                <span className="flex w-full items-center justify-between gap-4">
                  <span>{optionMap[option.id]?.label ?? option.id}</span>
                  {price && (
                    <span className="text-muted-foreground text-xs">{price}</span>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ToolsSection({ settings }: ToolsSectionProps) {
  const updatePreferences = useUpdatePreferences();
  const clientKeys = useChatUIStore(s => s.clientKeys);

  const { data: pricing = {} } = useQuery({
    queryKey: ["toolModelPricing"],
    queryFn: () => getToolModelPricing(),
    staleTime: 60 * 60 * 1000,
  });

  const availableProviders = useMemo(() => {
    const providers = new Set<string>();

    if (settings.configuredApiKeys?.openrouter || clientKeys.openrouter) {
      providers.add("openrouter");
    }
    if (settings.configuredApiKeys?.openai || clientKeys.openai) {
      providers.add("openai");
    }
    if (settings.configuredApiKeys?.anthropic || clientKeys.anthropic) {
      providers.add("anthropic");
    }

    // If no keys configured at all, show everything so the user can see options
    if (providers.size === 0) {
      providers.add("openrouter");
      providers.add("openai");
      providers.add("anthropic");
    }

    return providers;
  }, [settings.configuredApiKeys, clientKeys]);

  const save = async (patch: PreferencesUpdate) => {
    try {
      await updatePreferences.mutateAsync(patch);
    }
    catch (error) {
      console.error("Failed to save preferences:", error);
      const message = error instanceof Error ? error.message : "Failed to save preferences";
      toast.error(message);
    }
  };

  return (
    <SettingsSection
      title="Tools"
      description="Configure models used for automatic thread naming, icons, and handoff summarization."
    >
      <ToolModelSelect
        label="Title Generation Model"
        description="Model used for automatic thread title generation."
        value={settings.toolTitleModel}
        onChange={value => save({ toolTitleModel: value })}
        availableProviders={availableProviders}
        pricing={pricing}
      />

      <ToolModelSelect
        label="Icon Generation Model"
        description="Model used for automatic thread icon selection."
        value={settings.toolIconModel}
        onChange={value => save({ toolIconModel: value })}
        availableProviders={availableProviders}
        pricing={pricing}
      />

      <ToggleItem
        label="Handoff"
        description="Allow the AI to hand off conversations to a new thread with a summarized context. Disable if handoffs trigger too frequently."
        enabled={settings.handoffEnabled}
        onToggle={enabled => save({ handoffEnabled: enabled })}
      />

      {settings.handoffEnabled && (
        <ToolModelSelect
          label="Handoff Summarization Model"
          description="Model used to summarize context when handing off to a new thread."
          value={settings.toolHandoffModel}
          onChange={value => save({ toolHandoffModel: value })}
          availableProviders={availableProviders}
          pricing={pricing}
        />
      )}

      <MaxToolStepsSlider settings={settings} save={save} />
    </SettingsSection>
  );
}

function MaxToolStepsSlider({ settings, save }: { settings: UserSettingsData; save: (patch: PreferencesUpdate) => Promise<void> }) {
  const [localValue, setLocalValue] = useState(settings.maxToolSteps);

  return (
    <div className="space-y-2">
      <Label htmlFor="maxToolSteps">
        Max Tool Steps:
        {localValue}
      </Label>
      <p className="text-muted-foreground text-xs">
        Maximum number of tool-call steps the AI can take per response. Higher values allow longer multi-step workflows but may increase costs.
      </p>
      <Slider
        id="maxToolSteps"
        type="range"
        min="1"
        max="20"
        step="1"
        value={localValue}
        onChange={(e) => {
          setLocalValue(Number.parseInt(e.target.value, 10));
        }}
        onMouseUp={() => save({ maxToolSteps: localValue })}
        onTouchEnd={() => save({ maxToolSteps: localValue })}
        labels={["1", "20"]}
      />
    </div>
  );
}
