"use client";

import { toast } from "sonner";

import type { PreferencesUpdate } from "~/features/settings/types";

import { Skeleton } from "~/components/ui/skeleton";
import { useUpdatePreferences, useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { SelectionCardItem } from "../ui/selection-card-item";
import { SettingsSection } from "../ui/settings-section";

const landingPageOptions = [
  { value: "suggestions" as const, label: "Prompts", description: "Show some suggested prompts" },
  { value: "greeting" as const, label: "Greeting", description: "Simple welcome message" },
  { value: "blank" as const, label: "Blank", description: "Render nothing: blank slate" },
];

export function NewThreadPage() {
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
    return <NewThreadPageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-8 p-6">
        <SettingsSection
          title="New Thread"
          description="Configure what you see when starting a new thread."
        >
          <SelectionCardItem
            label="Landing Page Content"
            options={landingPageOptions}
            value={settings.landingPageContent}
            onChange={value => save({ landingPageContent: value })}
            layout="flex"
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function NewThreadPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-2">
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
