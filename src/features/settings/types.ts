import * as z from "zod";

import type { ApiKeyProvider } from "~/lib/api-keys/types";

import { THREAD_ICONS } from "~/lib/db/schema/chat";

export const STARTER_FAVORITE_MODELS = [
  "google/gemini-3-flash-preview",
  "moonshotai/kimi-k2.5",
  "anthropic/claude-sonnet-4.6",
  "z-ai/glm-5",
  "anthropic/claude-opus-4.6",
];

export type LandingPageContentType = "suggestions" | "greeting" | "blank";

export type ProfileCardWidget = "apiKeyStatus" | "openrouterCredits" | "storageQuota";

export const autoArchiveOptions = [0, 1, 3, 7, 14, 30, 90] as const;
export type AutoArchiveAfterDays = (typeof autoArchiveOptions)[number];

export const accentColorPresets = ["green", "pink", "cyan", "orange", "yellow", "blue", "gray"] as const;
export type AccentColorPreset = (typeof accentColorPresets)[number];
export type AccentColor = AccentColorPreset | number; // preset name or custom hue (0-360)

/**
 * Preferences tab - theme, instructions, thread naming, landing page content
 */
const accentColorSchema = z.union([
  z.enum(accentColorPresets),
  z.number().min(0).max(360),
]);

export const toolModelIds = ["gemini-flash-lite", "claude-haiku", "claude-3-haiku", "gpt-5-nano", "gpt-5-mini"] as const;
export type ToolModelId = (typeof toolModelIds)[number];

export const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  accentColor: accentColorSchema.default("green"),
  fontSans: z.enum(["rethink", "lexend", "atkinson", "system"]).default("rethink"),
  fontMono: z.enum(["jetbrains", "atkinson-mono", "system"]).default("jetbrains"),
  customInstructions: z.string().max(5000).optional(),
  defaultThreadName: z
    .string()
    .max(255)
    .transform(v => v.trim() || "New Thread"),
  defaultThreadIcon: z.enum(THREAD_ICONS).default("message-circle"),
  landingPageContent: z.enum(["suggestions", "greeting", "blank"]),
  sendMessageKeyboardShortcut: z.enum(["enter", "ctrlEnter", "shiftEnter"]).default("enter"),
  autoThreadNaming: z.boolean().default(false),
  autoTagging: z.boolean().default(false),
  autoThreadIcon: z.boolean().default(false),
  showSidebarIcons: z.boolean().default(false),
  useOcrForPdfs: z.boolean().default(false),
  autoCreateFilesFromPaste: z.boolean().default(true),
  inputHeightScale: z.number().int().min(0).max(4).default(0),
  hideModelProviderNames: z.boolean().default(false),
  profileCardWidget: z.enum(["apiKeyStatus", "openrouterCredits", "storageQuota"]).default("apiKeyStatus"),
  autoArchiveAfterDays: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(30), z.literal(90)]).default(0),
  toolTitleModel: z.enum(toolModelIds).default("gemini-flash-lite"),
  toolTagModel: z.enum(toolModelIds).default("gemini-flash-lite"),
  toolIconModel: z.enum(toolModelIds).default("gemini-flash-lite"),
  handoffEnabled: z.boolean().default(false),
  toolHandoffModel: z.enum(toolModelIds).default("gemini-flash-lite"),
  desktopNotifications: z.boolean().default(false),
});

/**
 * Update schema for partial updates - NO defaults to avoid overwriting existing values
 */
export const preferencesUpdateSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  accentColor: accentColorSchema.optional(),
  fontSans: z.enum(["rethink", "lexend", "atkinson", "system"]).optional(),
  fontMono: z.enum(["jetbrains", "atkinson-mono", "system"]).optional(),
  customInstructions: z.string().max(5000).optional(),
  defaultThreadName: z.string().max(255).transform(v => v.trim() || "New Thread").optional(),
  defaultThreadIcon: z.enum(THREAD_ICONS).optional(),
  landingPageContent: z.enum(["suggestions", "greeting", "blank"]).optional(),
  sendMessageKeyboardShortcut: z.enum(["enter", "ctrlEnter", "shiftEnter"]).optional(),
  autoThreadNaming: z.boolean().optional(),
  autoTagging: z.boolean().optional(),
  autoThreadIcon: z.boolean().optional(),
  showSidebarIcons: z.boolean().optional(),
  useOcrForPdfs: z.boolean().optional(),
  autoCreateFilesFromPaste: z.boolean().optional(),
  inputHeightScale: z.number().int().min(0).max(4).optional(),
  hideModelProviderNames: z.boolean().optional(),
  profileCardWidget: z.enum(["apiKeyStatus", "openrouterCredits", "storageQuota"]).optional(),
  autoArchiveAfterDays: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(30), z.literal(90)]).optional(),
  toolTitleModel: z.enum(toolModelIds).optional(),
  toolTagModel: z.enum(toolModelIds).optional(),
  toolIconModel: z.enum(toolModelIds).optional(),
  handoffEnabled: z.boolean().optional(),
  toolHandoffModel: z.enum(toolModelIds).optional(),
  desktopNotifications: z.boolean().optional(),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type PreferencesUpdate = Partial<PreferencesInput>;

/**
 * Profile tab - user information updates
 */
export const profileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.email("Invalid email address").optional(),
});

export const profileUpdateSchema = profileSchema.partial();

export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileUpdate = Partial<ProfileInput>;

/**
 * Integrations tab - API key management and storage preference
 * Key format: alphanumeric with common separators (hyphens, underscores, colons)
 */
export const integrationsSchema = z.object({
  apiKey: z
    .string()
    .min(1, "API key is required")
    .max(512, "API key is too long")
    .regex(/^[\w\-:]+$/, "API key contains invalid characters"),
  storeServerSide: z.boolean().default(false),
});

export type IntegrationsInput = z.infer<typeof integrationsSchema>;

/**
 * API key update - just the key and storage preference
 * Key format: alphanumeric with common separators (hyphens, underscores, colons)
 */
export const apiKeyUpdateSchema = z.object({
  apiKey: z
    .string()
    .min(1, "API key is required")
    .max(512, "API key is too long")
    .regex(/^[\w\-:]+$/, "API key contains invalid characters"),
  storeServerSide: z.boolean().default(false),
});

export type ApiKeyUpdateInput = z.infer<typeof apiKeyUpdateSchema>;

/**
 * Models tab - favorite models management
 */
export const favoriteModelsSchema = z.object({
  favoriteModels: z.array(z.string()).max(10, "Maximum 10 models allowed"),
});

export const favoriteModelsUpdateSchema = favoriteModelsSchema.partial();

export type FavoriteModelsInput = z.infer<typeof favoriteModelsSchema>;

export type UserSettingsData = {
  theme: "dark" | "light" | "system";
  accentColor: AccentColor;
  fontSans: "rethink" | "lexend" | "atkinson" | "system";
  fontMono: "jetbrains" | "atkinson-mono" | "system";
  customInstructions?: string;
  defaultThreadName: string;
  defaultThreadIcon: (typeof THREAD_ICONS)[number];
  landingPageContent: LandingPageContentType;
  sendMessageKeyboardShortcut: "enter" | "ctrlEnter" | "shiftEnter";
  autoThreadNaming: boolean;
  autoTagging: boolean;
  autoThreadIcon: boolean;
  showSidebarIcons: boolean;
  useOcrForPdfs: boolean;
  autoCreateFilesFromPaste: boolean;
  inputHeightScale: number;
  hideModelProviderNames?: boolean;
  profileCardWidget: ProfileCardWidget;
  autoArchiveAfterDays: AutoArchiveAfterDays;
  toolTitleModel: ToolModelId;
  toolTagModel: ToolModelId;
  toolIconModel: ToolModelId;
  handoffEnabled: boolean;
  toolHandoffModel: ToolModelId;
  desktopNotifications: boolean;
  // List of favorite model IDs from OpenRouter (max 10)
  favoriteModels?: string[];
  // Derived: which providers have a key configured (server can verify server-stored keys,
  // but only knows the preference for client-stored keys)
  configuredApiKeys?: Partial<Record<ApiKeyProvider, boolean>>;
};

// Storage for encrypted API keys (only populated if user opts into server storage)
// Values are in "hex(iv):hex(ciphertext):hex(authTag)" format
export type EncryptedApiKeysData = Partial<Record<ApiKeyProvider, string>>;
