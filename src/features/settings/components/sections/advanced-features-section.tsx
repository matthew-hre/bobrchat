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
    </SettingsSection>
  );
}
