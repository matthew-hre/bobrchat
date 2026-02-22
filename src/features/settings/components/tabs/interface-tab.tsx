"use client";

import { CoinsIcon, HardDriveIcon, KeyIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";

import type { AccentColorPreset, PreferencesUpdate } from "~/features/settings/types";

import { applyAccentColor } from "~/components/theme/theme-initializer";
import { ColorPicker } from "~/components/ui/color-picker";
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

const profileCardWidgetOptions = [
  { value: "apiKeyStatus" as const, label: "API Key Status", icon: KeyIcon, description: "Shows which API keys are configured" },
  { value: "openrouterCredits" as const, label: "OpenRouter Credits", icon: CoinsIcon, description: "Shows remaining OpenRouter credit balance" },
  { value: "storageQuota" as const, label: "Storage Quota", icon: HardDriveIcon, description: "Shows attachment storage usage" },
];

const accentColorOptions: { value: AccentColorPreset; color: string; label: string }[] = [
  { value: "green", color: "#A6E22E", label: "Green" },
  { value: "pink", color: "#F92672", label: "Pink" },
  { value: "orange", color: "#FD971F", label: "Orange" },
  { value: "blue", color: "#66D9EF", label: "Blue" },
  { value: "gray", color: "#888888", label: "Gray" },
];

export function InterfaceTab() {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });
  const updatePreferences = useUpdatePreferences();
  const { setTheme: applyTheme } = useTheme();
  const [localHue, setLocalHue] = useState<number | null>(null);

  const save = async (patch: PreferencesUpdate) => {
    const previousTheme = settings?.theme;
    const previousAccentColor = settings?.accentColor;

    try {
      if (patch.theme) {
        applyTheme(patch.theme);
      }
      if (patch.accentColor) {
        applyAccentColor(patch.accentColor);
      }

      await updatePreferences.mutateAsync(patch);
    }
    catch (error) {
      if (patch.theme && previousTheme) {
        applyTheme(previousTheme);
      }
      if (patch.accentColor && previousAccentColor) {
        applyAccentColor(previousAccentColor);
      }
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
      <div className="w-full space-y-8 p-6">
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

          <div className="space-y-3">
            <Label>Accent Color</Label>
            <ColorPicker
              presets={accentColorOptions}
              value={settings.accentColor}
              onChange={(val) => {
                if (typeof val === "number") {
                  save({ accentColor: val });
                }
                else {
                  save({ accentColor: val as AccentColorPreset });
                }
              }}
              customHue={localHue}
              onCustomHueChange={(hue) => {
                setLocalHue(hue);
                applyAccentColor(hue);
              }}
              onCustomHueCommit={async (hue) => {
                await save({ accentColor: hue });
                setLocalHue(null);
              }}
            />
          </div>
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

        <Separator />

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

        <Separator />

        <SettingsSection
          title="Models"
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

function InterfaceTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-6 p-6">
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
  );
}
