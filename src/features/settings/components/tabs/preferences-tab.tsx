"use client";

import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";

import type { LandingPageContentType } from "~/features/settings/types";

import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { useUpdatePreferences, useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { cn } from "~/lib/utils";

import { preferencesSchema } from "../../types";

type Theme = "light" | "dark" | "system";

type PreferencesState = {
  theme: Theme;
  boringMode: boolean;
  customInstructions: string;
  defaultThreadName: string;
  landingPageContent: LandingPageContentType;
  sendMessageKeyboardShortcut: string;
  autoThreadNaming: boolean;
  useOcrForPdfs: boolean;
  inputHeightScale: number;
};

const initialState: PreferencesState = {
  theme: "system",
  boringMode: false,
  customInstructions: "",
  defaultThreadName: "New Chat",
  landingPageContent: "suggestions",
  sendMessageKeyboardShortcut: "enter",
  autoThreadNaming: false,
  useOcrForPdfs: false,
  inputHeightScale: 0,
};

type PreferencesAction
  = | { type: "SET_ALL"; payload: PreferencesState }
    | { type: "UPDATE"; payload: Partial<PreferencesState> };

function preferencesReducer(state: PreferencesState, action: PreferencesAction): PreferencesState {
  switch (action.type) {
    case "SET_ALL":
      return action.payload;
    case "UPDATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

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

  const [prefs, dispatch] = useReducer(preferencesReducer, initialState);

  useEffect(() => {
    if (settings && !initializedRef.current) {
      initializedRef.current = true;
      dispatch({
        type: "SET_ALL",
        payload: {
          theme: settings.theme,
          boringMode: settings.boringMode,
          customInstructions: settings.customInstructions ?? "",
          defaultThreadName: settings.defaultThreadName,
          landingPageContent: settings.landingPageContent,
          sendMessageKeyboardShortcut: settings.sendMessageKeyboardShortcut,
          autoThreadNaming: settings.autoThreadNaming,
          useOcrForPdfs: settings.useOcrForPdfs,
          inputHeightScale: settings.inputHeightScale ?? 0,
        },
      });
    }
  }, [settings]);

  const updateAndSave = async (patch: Partial<PreferencesState>) => {
    const newPrefs = { ...prefs, ...patch };
    dispatch({ type: "UPDATE", payload: patch });

    try {
      const updates = preferencesSchema.parse(newPrefs);
      await updatePreferences.mutateAsync(updates);

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
        <div className="mx-auto max-w-md space-y-8">
          {/* Appearance & Interface */}
          <div className="space-y-6">
            <div className="space-y-1">
              <h4 className="text-foreground text-sm font-semibold">Appearance & Interface</h4>
              <p className="text-muted-foreground text-xs">Customize the look and feel of the application.</p>
            </div>

            {/* Theme Selection */}
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = prefs.theme === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateAndSave({ theme: option.value })}
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
                              bg-primary text-primary-foreground absolute
                              -right-1 -bottom-1 size-3 rounded-full p-0.5
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
                checked={prefs.boringMode}
                onCheckedChange={checked => updateAndSave({ boringMode: checked })}
              />
            </div>

            {/* Input Height Scale */}
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
                value={prefs.inputHeightScale}
                onChange={(e) => {
                  const newScale = Number.parseInt(e.target.value, 10);
                  updateAndSave({ inputHeightScale: newScale });
                }}
                labels={["None", "Lots"]}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-border border-t" />

          {/* Chat Experience */}
          <div className="space-y-6">
            <div className="space-y-1">
              <h4 className="text-foreground text-sm font-semibold">Chat Experience</h4>
              <p className="text-muted-foreground text-xs">Configure how chats behave and what you see when starting new conversations.</p>
            </div>

            {/* Landing Page Content */}
            <div className="space-y-3">
              <Label>New Chat Landing Page</Label>
              <div className="flex gap-2">
                {landingPageOptions.map((option) => {
                  const isSelected = prefs.landingPageContent === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateAndSave({ landingPageContent: option.value })}
                      className={cn(
                        `
                          flex flex-1 flex-col items-start gap-1 rounded-lg
                          border p-3 text-left transition-colors
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

            {/* Default Thread Name */}
            <div className="space-y-2">
              <Label htmlFor="defaultThreadName">Default Thread Name</Label>
              <Input
                id="defaultThreadName"
                type="text"
                value={prefs.defaultThreadName}
                onChange={e => dispatch({ type: "UPDATE", payload: { defaultThreadName: e.target.value } })}
                onBlur={() => updateAndSave({ defaultThreadName: prefs.defaultThreadName })}
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
                checked={prefs.autoThreadNaming}
                onCheckedChange={checked => updateAndSave({ autoThreadNaming: checked })}
              />
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
                  const isSelected = prefs.sendMessageKeyboardShortcut === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateAndSave({ sendMessageKeyboardShortcut: option.value })}
                      className={cn(
                        `
                          flex flex-1 flex-col items-start gap-1 rounded-lg
                          border p-3 text-left transition-colors
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
                value={prefs.customInstructions}
                onChange={e => dispatch({ type: "UPDATE", payload: { customInstructions: e.target.value } })}
                onBlur={() => updateAndSave({ customInstructions: prefs.customInstructions })}
                placeholder="Add any custom instructions for the AI assistant..."
                className="h-full max-h-60 resize-none"
              />
              <p className="text-muted-foreground text-xs">
                These instructions will be included in every conversation.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-border border-t" />

          {/* Advanced Features */}
          <div className="space-y-6">
            <div className="space-y-1">
              <h4 className="text-foreground text-sm font-semibold">Advanced Features</h4>
              <p className="text-muted-foreground text-xs">Additional features that may incur costs or require special setup.</p>
            </div>

            {/* OCR for PDF Uploads */}
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="useOcrForPdfs">OCR for PDF Uploads</Label>
                <span className="text-muted-foreground text-xs">
                  Automatically extract text from PDF uploads using mistral-ocr (recommended for image-dense PDFs). $2 per 1000 pages.
                </span>
              </div>
              <Switch
                id="useOcrForPdfs"
                checked={prefs.useOcrForPdfs}
                onCheckedChange={checked => updateAndSave({ useOcrForPdfs: checked })}
              />
            </div>
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
