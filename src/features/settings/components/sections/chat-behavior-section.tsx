"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { AutoArchiveAfterDays, PreferencesUpdate, UserSettingsData } from "~/features/settings/types";
import type { ThreadIcon } from "~/lib/db/schema/chat";

import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useUpdatePreferences } from "~/features/settings/hooks/use-user-settings";
import { autoArchiveOptions } from "~/features/settings/types";

import { IconSelectItem } from "../ui/icon-select-item";
import { SettingsSection } from "../ui/settings-section";
import { TextInputItem } from "../ui/text-input-item";
import { ToggleItem } from "../ui/toggle-item";

const autoArchiveLabels: Record<AutoArchiveAfterDays, string> = {
  0: "Never",
  1: "After 1 day",
  3: "After 3 days",
  7: "After 1 week",
  14: "After 2 weeks",
  30: "After 1 month",
  90: "After 3 months",
};

type ChatBehaviorSectionProps = {
  settings: UserSettingsData;
};

export function ChatBehaviorSection({ settings }: ChatBehaviorSectionProps) {
  const updatePreferences = useUpdatePreferences();

  const [defaultThreadName, setDefaultThreadName] = useState("");
  const [defaultThreadIcon, setDefaultThreadIcon] = useState<ThreadIcon>("message-circle");
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    setDefaultThreadName(settings.defaultThreadName);
    setDefaultThreadIcon(settings.defaultThreadIcon);
    setCustomInstructions(settings.customInstructions ?? "");
  }, [settings]);

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
      title="Thread Behavior"
      description="Configure how threads behave."
    >
      <TextInputItem
        label="Default Thread Name"
        description="The default name for new threads."
        value={defaultThreadName}
        placeholder="New Thread"
        maxLength={80}
        onChange={setDefaultThreadName}
        onBlur={() => {
          if (defaultThreadName !== settings.defaultThreadName && defaultThreadName.length <= 80) {
            save({ defaultThreadName });
          }
        }}
      />

      {!settings.showSidebarIcons && (
        <IconSelectItem
          label="Default Thread Icon"
          description="The default icon for new threads."
          value={defaultThreadIcon}
          onChange={(icon) => {
            setDefaultThreadIcon(icon);
            if (icon !== settings.defaultThreadIcon) {
              save({ defaultThreadIcon: icon });
            }
          }}
        />
      )}

      <ToggleItem
        label="Automatic Thread Renaming"
        description="Automatically generate a short title for new threads."
        enabled={settings.autoThreadNaming}
        onToggle={enabled => save({ autoThreadNaming: enabled })}
      />

      {!settings.showSidebarIcons && (
        <ToggleItem
          label="Automatic Thread Icon"
          description="Automatically select a relevant icon based on thread content."
          enabled={settings.autoThreadIcon}
          onToggle={enabled => save({ autoThreadIcon: enabled })}
        />
      )}

      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Auto-Archive Threads</Label>
          <p className="text-muted-foreground text-xs">
            Automatically archive threads after a period of inactivity.
          </p>
        </div>
        <Select
          value={String(settings.autoArchiveAfterDays ?? 0)}
          onValueChange={v => save({ autoArchiveAfterDays: Number(v) as AutoArchiveAfterDays })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {autoArchiveOptions.map(days => (
              <SelectItem key={days} value={String(days)}>
                {autoArchiveLabels[days]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TextInputItem
        label="Custom Instructions"
        description="These instructions will be included in every thread."
        value={customInstructions}
        placeholder="Add any custom instructions for the AI assistant..."
        size="multi"
        onChange={setCustomInstructions}
        onBlur={() => {
          if (customInstructions !== (settings.customInstructions ?? "")) {
            save({ customInstructions });
          }
        }}
      />
    </SettingsSection>
  );
}
