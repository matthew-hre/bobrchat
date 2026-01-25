"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import type { PreferencesUpdate } from "~/features/settings/types";

import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Slider } from "~/components/ui/slider";
import { useUpdatePreferences, useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { SelectionCardItem } from "../ui/selection-card-item";
import { SettingsSection } from "../ui/settings-section";
import { ToggleItem } from "../ui/toggle-item";

const themeOptions = [
  { value: "light" as const, label: "Light", icon: SunIcon },
  { value: "dark" as const, label: "Dark", icon: MoonIcon },
  { value: "system" as const, label: "System", icon: MonitorIcon },
];

const landingPageOptions = [
  { value: "suggestions" as const, label: "Prompts", description: "Show some suggested prompts" },
  { value: "greeting" as const, label: "Greeting", description: "Simple welcome message" },
  { value: "blank" as const, label: "Blank", description: "Render nothing: blank slate" },
];

const sendMessageKeyboardShortcutOptions = [
  { value: "enter" as const, label: <Kbd>Enter</Kbd> },
  { value: "ctrlEnter" as const, label: <Kbd>Ctrl + Enter</Kbd> },
  { value: "shiftEnter" as const, label: <Kbd>Shift + Enter</Kbd> },
];

export function InterfaceTab() {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });
  const updatePreferences = useUpdatePreferences();
  const { setTheme: applyTheme } = useTheme();

  const save = async (patch: PreferencesUpdate) => {
    try {
      await updatePreferences.mutateAsync(patch);

      if (patch.theme) {
        applyTheme(patch.theme);
      }
      if (patch.boringMode !== undefined) {
        if (patch.boringMode) {
          document.documentElement.classList.add("boring");
        }
        else {
          document.documentElement.classList.remove("boring");
        }
      }
    }
    catch (error) {
      console.error("Failed to save preferences:", error);
      const message = error instanceof Error ? error.message : "Failed to save preferences";
      toast.error(message);
    }
  };

  if (isLoading || !settings) {
    return <InterfaceTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Interface</h3>
        <p className="text-muted-foreground text-sm">
          Customize the look and feel of the application.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-8">
          <SettingsSection
            title="Appearance"
            description="Choose your preferred color scheme."
          >
            <SelectionCardItem
              label="Theme"
              options={themeOptions}
              value={settings.theme}
              onChange={value => save({ theme: value })}
              layout="grid"
              columns={3}
            />

            <ToggleItem
              label="Boring Mode"
              description="Disable the green accent for a lamer look."
              enabled={settings.boringMode}
              onToggle={enabled => save({ boringMode: enabled })}
            />
          </SettingsSection>

          <Separator />

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

          <Separator />

          <SettingsSection
            title="New Chat"
            description="Configure what you see when starting a new conversation."
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
    </div>
  );
}

function InterfaceTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
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
    </div>
  );
}
