"use client";

import { toast } from "sonner";

import type { PreferencesUpdate, UserSettingsData } from "~/features/settings/types";

import { useUpdatePreferences } from "~/features/settings/hooks/use-user-settings";

import { SettingsSection } from "../ui/settings-section";
import { ToggleItem } from "../ui/toggle-item";

type AdvancedFeaturesSectionProps = {
  settings: UserSettingsData;
};

export function AdvancedFeaturesSection({ settings }: AdvancedFeaturesSectionProps) {
  const updatePreferences = useUpdatePreferences();

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
      title="Advanced Features"
      description="Additional features that may incur costs or require special setup."
    >
      <ToggleItem
        label="OCR for PDF Uploads"
        description="Automatically extract text from PDF uploads using mistral-ocr (recommended for image-dense PDFs). $2 per 1000 pages."
        enabled={settings.useOcrForPdfs}
        onToggle={enabled => save({ useOcrForPdfs: enabled })}
      />
      <ToggleItem
        label="Automatically Create Files from Paste"
        description="When pasting large amounts of text, automatically create a file attachment instead of inserting it inline."
        enabled={settings.autoCreateFilesFromPaste}
        onToggle={enabled => save({ autoCreateFilesFromPaste: enabled })}
      />
      <ToggleItem
        label="Auto-Scroll During Generation"
        description="Automatically scroll to the bottom as new content is generated. Disable to prevent scroll hijacking."
        enabled={settings.autoScrollDuringGeneration}
        onToggle={enabled => save({ autoScrollDuringGeneration: enabled })}
      />
      <ToggleItem
        label="Desktop Notifications"
        description="Notify me when a response finishes while I'm in another tab."
        enabled={settings.desktopNotifications}
        onToggle={async (enabled) => {
          if (enabled && "Notification" in window) {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
              toast.error("Notification permission denied. Enable it in your browser settings.");
              return;
            }
          }
          save({ desktopNotifications: enabled });
        }}
      />
    </SettingsSection>
  );
}
