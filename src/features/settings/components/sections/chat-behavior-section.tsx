"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { PreferencesUpdate, UserSettingsData } from "~/features/settings/types";

import { useUpdatePreferences } from "~/features/settings/hooks/use-user-settings";

import { SettingsSection } from "../ui/settings-section";
import { TextInputItem } from "../ui/text-input-item";
import { ToggleItem } from "../ui/toggle-item";

type ChatBehaviorSectionProps = {
  settings: UserSettingsData;
};

export function ChatBehaviorSection({ settings }: ChatBehaviorSectionProps) {
  const updatePreferences = useUpdatePreferences();

  const [defaultThreadName, setDefaultThreadName] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    setDefaultThreadName(settings.defaultThreadName);
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
        onChange={setDefaultThreadName}
        onBlur={() => {
          if (defaultThreadName !== settings.defaultThreadName) {
            save({ defaultThreadName });
          }
        }}
      />

      <ToggleItem
        label="Automatic Thread Renaming"
        description="Automatically generate a short title for new conversations."
        enabled={settings.autoThreadNaming}
        onToggle={enabled => save({ autoThreadNaming: enabled })}
      />

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
