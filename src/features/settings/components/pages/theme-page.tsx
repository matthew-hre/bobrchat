"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";

import type { AccentColorPreset, PreferencesUpdate, UserSettingsData } from "~/features/settings/types";

import { applyAccentColor, applyFonts } from "~/components/theme/theme-initializer";
import { ColorPicker } from "~/components/ui/color-picker";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { useUpdatePreferences, useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { SelectionCardItem } from "../ui/selection-card-item";
import { SettingsSection } from "../ui/settings-section";

const themeOptions = [
  { value: "light" as const, label: "Light", icon: SunIcon },
  { value: "dark" as const, label: "Dark", icon: MoonIcon },
  { value: "system" as const, label: "System", icon: MonitorIcon },
];

const accentColorOptions: { value: AccentColorPreset; color: string; label: string }[] = [
  { value: "green", color: "#A6E22E", label: "Green" },
  { value: "pink", color: "#F92672", label: "Pink" },
  { value: "orange", color: "#FD971F", label: "Orange" },
  { value: "blue", color: "#66D9EF", label: "Blue" },
  { value: "gray", color: "#888888", label: "Gray" },
];

export function ThemePage() {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });
  const updatePreferences = useUpdatePreferences();
  const { setTheme: applyTheme } = useTheme();
  const [localHue, setLocalHue] = useState<number | null>(null);

  const save = async (patch: PreferencesUpdate) => {
    const previousTheme = settings?.theme;
    const previousAccentColor = settings?.accentColor;
    const previousFontSans = settings?.fontSans;
    const previousFontMono = settings?.fontMono;

    try {
      if (patch.theme) {
        applyTheme(patch.theme);
      }
      if (patch.accentColor) {
        applyAccentColor(patch.accentColor);
      }
      if (patch.fontSans || patch.fontMono) {
        applyFonts(
          patch.fontSans ?? settings?.fontSans ?? "rethink",
          patch.fontMono ?? settings?.fontMono ?? "jetbrains",
        );
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
      if (patch.fontSans || patch.fontMono) {
        applyFonts(previousFontSans ?? "rethink", previousFontMono ?? "jetbrains");
      }
      console.error("Failed to save preferences:", error);
      const message = error instanceof Error ? error.message : "Failed to save preferences";
      toast.error(message);
    }
  };

  if (isLoading || !settings) {
    return <ThemePageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <SettingsSection
          title="Theme & Colors"
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
          title="Fonts"
          description="Choose your preferred typefaces."
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Sans-Serif Font</Label>
              <Select
                value={settings.fontSans ?? "rethink"}
                onValueChange={v => save({ fontSans: v as UserSettingsData["fontSans"] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rethink" style={{ fontFamily: "var(--font-rethink)" }}>Rethink Sans</SelectItem>
                  <SelectItem value="lexend" style={{ fontFamily: "var(--font-lexend)" }}>Lexend</SelectItem>
                  <SelectItem value="atkinson" style={{ fontFamily: "var(--font-atkinson)" }}>Atkinson Hyperlegible</SelectItem>
                  <SelectItem value="system" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>System Default</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Monospace Font</Label>
              <Select
                value={settings.fontMono ?? "jetbrains"}
                onValueChange={v => save({ fontMono: v as UserSettingsData["fontMono"] })}
              >
                <SelectTrigger className="w-full font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jetbrains" style={{ fontFamily: "var(--font-jetbrains)" }}>JetBrains Mono</SelectItem>
                  <SelectItem value="atkinson-mono" style={{ fontFamily: "var(--font-atkinson-mono)" }}>Atkinson Hyperlegible Mono</SelectItem>
                  <SelectItem value="system" style={{ fontFamily: "ui-monospace, 'SFMono-Regular', 'Menlo', 'Consolas', monospace" }}>System Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function ThemePageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
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

        <Separator />

        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
