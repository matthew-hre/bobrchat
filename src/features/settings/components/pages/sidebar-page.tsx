"use client";

import { CoinsIcon, HardDriveIcon, KeyIcon } from "lucide-react";
import { toast } from "sonner";

import type { PreferencesUpdate } from "~/features/settings/types";

import { Skeleton } from "~/components/ui/skeleton";
import { useUpdatePreferences, useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { SelectionCardItem } from "../ui/selection-card-item";
import { SettingsSection } from "../ui/settings-section";
import { ToggleItem } from "../ui/toggle-item";

const profileCardWidgetOptions = [
  { value: "apiKeyStatus" as const, label: "API Key Status", icon: KeyIcon, description: "Shows which API keys are configured" },
  { value: "openrouterCredits" as const, label: "OpenRouter Credits", icon: CoinsIcon, description: "Shows remaining OpenRouter credit balance" },
  { value: "storageQuota" as const, label: "Storage Quota", icon: HardDriveIcon, description: "Shows attachment storage usage" },
];

export function SidebarPage() {
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
    return <SidebarPageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <SettingsSection
          title="Sidebar"
          description="Configure sidebar appearance."
        >
          <ToggleItem
            label="Disable Sidebar Icons"
            description="Hide icons next to threads in the sidebar. Hides relevant settings."
            enabled={settings.showSidebarIcons}
            onToggle={enabled => save({ showSidebarIcons: enabled })}
          />

          <SelectionCardItem
            label="Profile Card Widget"
            description="Choose what to display below your name in the sidebar."
            options={profileCardWidgetOptions}
            value={settings.profileCardWidget}
            onChange={value => save({ profileCardWidget: value })}
            layout="flex"
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function SidebarPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-9 w-full" />
        </div>
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
