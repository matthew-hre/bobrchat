"use client";

import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { LandingPageContentType } from "~/features/settings/types";

import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { useUpdatePreferences, useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { cn } from "~/lib/utils";

import { preferencesSchema } from "../../types";

type Theme = "light" | "dark" | "system";

const themeOptions: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

const landingPageOptions: { value: LandingPageContentType; label: string; description: string }[] = [
  { value: "suggestions", label: "Prompts", description: "Show some suggested prompts" },
  { value: "greeting", label: "Greeting", description: "Simple welcome message" },
  { value: "blank", label: "Blank", description: "Render nothing: blank slate" },
];

const sendMessageKeyboardShortcutOptions = [
  { value: "enter", label: <Kbd>Enter</Kbd> },
  { value: "ctrlEnter", label: <Kbd>Ctrl + Enter</Kbd> },
  { value: "shiftEnter", label: <Kbd>Shift + Enter</Kbd> },
];

export function PreferencesTab() {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });
  const updatePreferences = useUpdatePreferences();
  const initializedRef = useRef(false);

  const { setTheme: applyTheme } = useTheme();

  const [theme, setTheme] = useState<Theme>(() => settings?.theme ?? "system");

  const [boringMode, setBoringMode] = useState(settings?.boringMode ?? false);

  const [customInstructions, setCustomInstructions] = useState(
    () => settings?.customInstructions ?? "",
  );
  const [defaultThreadName, setDefaultThreadName] = useState(
    () => settings?.defaultThreadName ?? "New Chat",
  );
  const [landingPageContent, setLandingPageContent] = useState<LandingPageContentType>(
    () => settings?.landingPageContent ?? "suggestions",
  );
  const [sendMessageKeyboardShortcut, setSendMessageKeyboardShortcut] = useState(
    () => settings?.sendMessageKeyboardShortcut ?? "enter",
  );
  const [autoThreadNaming, setAutoThreadNaming] = useState(
    () => settings?.autoThreadNaming ?? false,
  );

  useEffect(() => {
    if (settings && !initializedRef.current) {
      initializedRef.current = true;
      setTheme(settings.theme);
      setBoringMode(settings.boringMode);
      setCustomInstructions(settings.customInstructions ?? "");
      setDefaultThreadName(settings.defaultThreadName);
      setLandingPageContent(settings.landingPageContent);
      setSendMessageKeyboardShortcut(settings.sendMessageKeyboardShortcut);
      setAutoThreadNaming(settings.autoThreadNaming);
    }
  }, [settings]);

  const handleSave = async (
    themeVal: Theme,
    boringMode: boolean,
    customInst: string,
    defaultName: string,
    landingPageVal: LandingPageContentType,
    sendMessageKeyboardShortcutVal: string,
    autoThreadNamingVal: boolean,
  ) => {
    try {
      const updates = preferencesSchema.parse({
        theme: themeVal,
        boringMode,
        customInstructions: customInst,
        defaultThreadName: defaultName,
        landingPageContent: landingPageVal,
        sendMessageKeyboardShortcut: sendMessageKeyboardShortcutVal,
        autoThreadNaming: autoThreadNamingVal,
      });

      await updatePreferences.mutateAsync(updates);
      applyTheme(themeVal);
      if (boringMode) {
        document.documentElement.classList.add("boring");
      }
      else {
        document.documentElement.classList.remove("boring");
      }
    }
    catch (error) {
      console.error("Failed to save preferences:", error);
      const message = error instanceof Error ? error.message : "Failed to save preferences";
      toast.error(message);
    }
  };

  if (isLoading) {
    return <PreferencesTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Preferences</h3>
        <p className="text-muted-foreground text-sm">
          Customize your chat experience and appearance.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-6">
          {/* Theme Selection */}
          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setTheme(option.value);
                      handleSave(option.value, boringMode, customInstructions, defaultThreadName, landingPageContent, sendMessageKeyboardShortcut, autoThreadNaming);
                    }}
                    className={cn(
                      `
                        flex flex-col items-center gap-2 rounded-lg border p-3
                        transition-colors
                      `,
                      isSelected
                        ? "border-primary bg-primary/5"
                        : `
                          border-input
                          hover:bg-muted
                        `,
                    )}
                  >
                    <div className="relative">
                      <Icon className="size-5" />
                      {isSelected && (
                        <CheckIcon
                          className={cn(`
                            bg-primary text-primary-foreground absolute -right-1
                            -bottom-1 size-3 rounded-full p-0.5
                          `)}
                        />
                      )}
                    </div>
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Boring Mode Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="boringMode">Boring Mode</Label>
              <span className="text-muted-foreground text-xs">
                Disable the green accent for a lamer look.
              </span>
            </div>
            <Switch
              id="boringMode"
              checked={boringMode}
              onCheckedChange={(checked) => {
                setBoringMode(checked);
                handleSave(theme, checked, customInstructions, defaultThreadName, landingPageContent, sendMessageKeyboardShortcut, autoThreadNaming);
              }}
            />
          </div>

          {/* Default Thread Name */}
          <div className="space-y-2">
            <Label htmlFor="defaultThreadName">Default Thread Name</Label>
            <Input
              id="defaultThreadName"
              type="text"
              value={defaultThreadName}
              onChange={e => setDefaultThreadName(e.target.value)}
              onBlur={() => handleSave(theme, boringMode, customInstructions, defaultThreadName, landingPageContent, sendMessageKeyboardShortcut, autoThreadNaming)}
              placeholder="New Chat"
            />
            <p className="text-muted-foreground text-xs">
              The default name for new chat threads.
            </p>
          </div>

          {/* Automatic Thread Renaming */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="autoThreadNaming">Automatic Thread Renaming</Label>
              <span className="text-muted-foreground text-xs">
                Automatically generate a short title for new conversations.
              </span>
            </div>
            <Switch
              id="autoThreadNaming"
              checked={autoThreadNaming}
              onCheckedChange={(checked) => {
                setAutoThreadNaming(checked);
                handleSave(theme, boringMode, customInstructions, defaultThreadName, landingPageContent, sendMessageKeyboardShortcut, checked);
              }}
            />
          </div>

          {/* Landing Page Content */}
          <div className="space-y-3">
            <Label>New Chat Landing Page</Label>
            <div className="flex gap-2">
              {landingPageOptions.map((option) => {
                const isSelected = landingPageContent === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setLandingPageContent(option.value);
                      handleSave(theme, boringMode, customInstructions, defaultThreadName, option.value, sendMessageKeyboardShortcut, autoThreadNaming);
                    }}
                    className={cn(
                      `
                        flex flex-1 flex-col items-start gap-1 rounded-lg border
                        p-3 text-left transition-colors
                      `,
                      isSelected
                        ? "border-primary bg-primary/5"
                        : `
                          border-input
                          hover:bg-muted
                        `,
                    )}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Send Message Keyboard Shortcut */}
          <div className="space-y-2">
            <Label htmlFor="sendMessageKeyboardShortcut">Send Message Keyboard Shortcut</Label>
            <p
              className="text-muted-foreground -mt-1 text-xs"
            >
              Choose which keyboard shortcut to use for sending messages.
            </p>
            <div className="flex gap-2">
              {sendMessageKeyboardShortcutOptions.map((option) => {
                const isSelected = sendMessageKeyboardShortcut === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSendMessageKeyboardShortcut(option.value as typeof sendMessageKeyboardShortcut);
                      handleSave(theme, boringMode, customInstructions, defaultThreadName, landingPageContent, option.value, autoThreadNaming);
                    }}
                    className={cn(
                      `
                        flex flex-1 flex-col items-start gap-1 rounded-lg border
                        p-3 text-left transition-colors
                      `,
                      isSelected
                        ? "border-primary bg-primary/5"
                        : `
                          border-input
                          hover:bg-muted
                        `,
                    )}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label htmlFor="customInstructions">Custom Instructions</Label>
            <Textarea
              id="customInstructions"
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              onBlur={() => handleSave(theme, boringMode, customInstructions, defaultThreadName, landingPageContent, sendMessageKeyboardShortcut, autoThreadNaming)}
              placeholder="Add any custom instructions for the AI assistant..."
              className="h-full max-h-60 resize-none"
            />
            <p className="text-muted-foreground text-xs">
              These instructions will be included in every conversation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferencesTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <Skeleton className="h-6 w-28" />
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
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-3 w-72" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-30 w-full" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </div>
    </div>
  );
}
