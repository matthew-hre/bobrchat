"use client";

import { toast } from "sonner";

import type { PreferencesUpdate } from "~/features/settings/types";

import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Slider } from "~/components/ui/slider";
import { useUpdatePreferences, useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { SelectionCardItem } from "../ui/selection-card-item";
import { SettingsSection } from "../ui/settings-section";

const sendMessageKeyboardShortcutOptions = [
  { value: "enter" as const, label: <Kbd>Enter</Kbd> },
  { value: "ctrlEnter" as const, label: (
    <span className="flex flex-row gap-1">
      <Kbd>Ctrl</Kbd>
      <Kbd>Enter</Kbd>
    </span>
  ) },
  { value: "shiftEnter" as const, label: (
    <span className="flex flex-row gap-1">
      <Kbd>Shift</Kbd>
      <Kbd>Enter</Kbd>
    </span>
  ) },
];

export function InputPage() {
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
    return <InputPageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-8 p-6">
        <SettingsSection
          title="Input & Controls"
          description="Configure input behavior and keyboard shortcuts."
        >
          <div className="space-y-2">
            <Label htmlFor="inputHeightScale">Input Box Height</Label>
            <p className="text-muted-foreground text-xs">
              Control how much the input box expands based on content. "None" keeps it compact, "Lots" expands up to 15 lines.
            </p>
            <Slider
              id="inputHeightScale"
              type="range"
              min="0"
              max="4"
              step="1"
              value={settings.inputHeightScale ?? 0}
              onChange={(e) => {
                const newScale = Number.parseInt(e.target.value, 10);
                save({ inputHeightScale: newScale });
              }}
              labels={["None", "Lots"]}
            />
          </div>

          <SelectionCardItem
            label="Send Message Keyboard Shortcut"
            description="Choose which keyboard shortcut to use for sending messages."
            options={sendMessageKeyboardShortcutOptions}
            value={settings.sendMessageKeyboardShortcut}
            onChange={value => save({ sendMessageKeyboardShortcut: value })}
            layout="flex"
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function InputPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
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
