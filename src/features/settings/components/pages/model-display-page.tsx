"use client";

import { toast } from "sonner";

import type { PreferencesUpdate } from "~/features/settings/types";

import { Skeleton } from "~/components/ui/skeleton";
import { useUpdatePreferences, useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { SettingsSection } from "../ui/settings-section";
import { ToggleItem } from "../ui/toggle-item";

export function ModelDisplayPage() {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });
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

  if (isLoading || !settings) {
    return <ModelDisplayPageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <SettingsSection
          title="Model Display"
          description="Configure how model names are displayed."
        >
          <ToggleItem
            label="Hide Provider Names"
            description="Show only model names with logos instead of 'Provider: Model Name'."
            enabled={settings.hideModelProviderNames ?? false}
            onToggle={enabled => save({ hideModelProviderNames: enabled })}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function ModelDisplayPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}
