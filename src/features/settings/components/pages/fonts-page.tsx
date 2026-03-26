"use client";

import { toast } from "sonner";

import type { PreferencesUpdate, UserSettingsData } from "~/features/settings/types";

import { applyFonts } from "~/components/theme/theme-initializer";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { useUpdatePreferences, useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { SettingsSection } from "../ui/settings-section";

export function FontsPage() {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });
  const updatePreferences = useUpdatePreferences();

  const save = async (patch: PreferencesUpdate) => {
    const previousFontSans = settings?.fontSans;
    const previousFontMono = settings?.fontMono;

    try {
      if (patch.fontSans || patch.fontMono) {
        applyFonts(
          patch.fontSans ?? settings?.fontSans ?? "rethink",
          patch.fontMono ?? settings?.fontMono ?? "jetbrains",
        );
      }

      await updatePreferences.mutateAsync(patch);
    }
    catch (error) {
      if (patch.fontSans || patch.fontMono) {
        applyFonts(previousFontSans ?? "rethink", previousFontMono ?? "jetbrains");
      }
      console.error("Failed to save preferences:", error);
      const message = error instanceof Error ? error.message : "Failed to save preferences";
      toast.error(message);
    }
  };

  if (isLoading || !settings) {
    return <FontsPageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="w-full max-w-2xl space-y-8 p-6">
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

function FontsPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="w-full max-w-2xl space-y-6 p-6">
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
