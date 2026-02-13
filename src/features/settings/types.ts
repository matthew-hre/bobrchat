import * as z from "zod";

import { THREAD_ICONS } from "~/lib/db/schema/chat";

/**
 * Supported API key providers.
 * Add new providers here to extend support across the application.
 */
export type ApiKeyProvider = "openrouter" | "parallel";

export type LandingPageContentType = "suggestions" | "greeting" | "blank";

export type ProfileCardWidget = "apiKeyStatus" | "openrouterCredits" | "storageQuota";

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

export const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  accentColor: accentColorSchema.default("green"),
  customInstructions: z.string().max(5000).optional(),
  defaultThreadName: z
    .string()
    .max(255)
    .transform(v => v.trim() || "New Thread"),
  defaultThreadIcon: z.enum(THREAD_ICONS).default("message-circle"),
  landingPageContent: z.enum(["suggestions", "greeting", "blank"]),
  sendMessageKeyboardShortcut: z.enum(["enter", "ctrlEnter", "shiftEnter"]).default("enter"),
  autoThreadNaming: z.boolean().default(false),
  autoThreadIcon: z.boolean().default(false),
  showSidebarIcons: z.boolean().default(false),
  useOcrForPdfs: z.boolean().default(false),
  autoCreateFilesFromPaste: z.boolean().default(true),
  inputHeightScale: z.number().int().min(0).max(4).default(0),
  hideModelProviderNames: z.boolean().default(false),
  profileCardWidget: z.enum(["apiKeyStatus", "openrouterCredits", "storageQuota"]).default("apiKeyStatus"),
});

/**
 * Update schema for partial updates - NO defaults to avoid overwriting existing values
 */
export const preferencesUpdateSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  accentColor: accentColorSchema.optional(),
  customInstructions: z.string().max(5000).optional(),
  defaultThreadName: z.string().max(255).transform(v => v.trim() || "New Thread").optional(),
  defaultThreadIcon: z.enum(THREAD_ICONS).optional(),
  landingPageContent: z.enum(["suggestions", "greeting", "blank"]).optional(),
  sendMessageKeyboardShortcut: z.enum(["enter", "ctrlEnter", "shiftEnter"]).optional(),
  autoThreadNaming: z.boolean().optional(),
  autoThreadIcon: z.boolean().optional(),
  showSidebarIcons: z.boolean().optional(),
  useOcrForPdfs: z.boolean().optional(),
  autoCreateFilesFromPaste: z.boolean().optional(),
  inputHeightScale: z.number().int().min(0).max(4).optional(),
  hideModelProviderNames: z.boolean().optional(),
  profileCardWidget: z.enum(["apiKeyStatus", "openrouterCredits", "storageQuota"]).optional(),
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
  customInstructions?: string;
  defaultThreadName: string;
  defaultThreadIcon: (typeof THREAD_ICONS)[number];
  landingPageContent: LandingPageContentType;
  sendMessageKeyboardShortcut: "enter" | "ctrlEnter" | "shiftEnter";
  autoThreadNaming: boolean;
  autoThreadIcon: boolean;
  showSidebarIcons: boolean;
  useOcrForPdfs: boolean;
  autoCreateFilesFromPaste: boolean;
  inputHeightScale: number;
  hideModelProviderNames?: boolean;
  profileCardWidget: ProfileCardWidget;
  // List of favorite model IDs from OpenRouter (max 10)
  favoriteModels?: string[];
  // Derived: which providers have a key configured (server can verify server-stored keys,
  // but only knows the preference for client-stored keys)
  configuredApiKeys?: Partial<Record<ApiKeyProvider, boolean>>;
};

// Storage for encrypted API keys (only populated if user opts into server storage)
// Values are in "hex(iv):hex(ciphertext):hex(authTag)" format
export type EncryptedApiKeysData = Partial<Record<ApiKeyProvider, string>>;
