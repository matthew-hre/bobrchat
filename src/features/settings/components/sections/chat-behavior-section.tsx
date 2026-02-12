"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { PreferencesUpdate, UserSettingsData } from "~/features/settings/types";
import type { ThreadIcon } from "~/lib/db/schema/chat";

import { useUpdatePreferences } from "~/features/settings/hooks/use-user-settings";

import { IconSelectItem } from "../ui/icon-select-item";
import { SettingsSection } from "../ui/settings-section";
import { TextInputItem } from "../ui/text-input-item";
import { ToggleItem } from "../ui/toggle-item";

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
      title="Chat Behavior"
      description="Configure how chats behave."
    >
      <TextInputItem
        label="Default Thread Name"
        description="The default name for new chat threads."
        value={defaultThreadName}
        placeholder="New Chat"
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
          description="The default icon for new chat threads."
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
        description="Automatically generate a short title for new conversations."
        enabled={settings.autoThreadNaming}
        onToggle={enabled => save({ autoThreadNaming: enabled })}
      />

      {!settings.showSidebarIcons && (
        <ToggleItem
          label="Automatic Thread Icon"
          description="Automatically select a relevant icon based on conversation content."
          enabled={settings.autoThreadIcon}
          onToggle={enabled => save({ autoThreadIcon: enabled })}
        />
      )}

      <TextInputItem
        label="Custom Instructions"
        description="These instructions will be included in every conversation."
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
