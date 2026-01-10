import { z } from "zod";

/**
 * Supported API key providers.
 * Add new providers here to extend support across the application.
 */
export type ApiKeyProvider = "openrouter" | "parallel";

export type LandingPageContentType = "suggestions" | "greeting" | "blank";

/**
 * Preferences tab - theme, instructions, thread naming, landing page content
 */
export const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  boringMode: z.boolean().default(false),
  customInstructions: z.string().max(5000).optional(),
  defaultThreadName: z
    .string()
    .max(255)
    .transform(v => v.trim() || "New Chat"),
  landingPageContent: z.enum(["suggestions", "greeting", "blank"]),
  autoThreadNaming: z.boolean().default(false),
});

export const preferencesUpdateSchema = preferencesSchema.partial();

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
  boringMode: boolean;
  customInstructions?: string;
  defaultThreadName: string;
  landingPageContent: LandingPageContentType;
  autoThreadNaming: boolean;
  // Tracks which API key providers have server-side encrypted storage enabled
  // 'client' = stored in browser localStorage, 'server' = stored encrypted on server
  apiKeyStorage: Partial<Record<ApiKeyProvider, "client" | "server">>;
  // List of favorite model IDs from OpenRouter (max 10)
  favoriteModels?: string[];
  // Derived: which providers have a key configured (server can verify server-stored keys,
  // but only knows the preference for client-stored keys)
  configuredApiKeys?: Partial<Record<ApiKeyProvider, boolean>>;
};

// Storage for encrypted API keys (only populated if user opts into server storage)
// Values are in "hex(iv):hex(ciphertext):hex(authTag)" format
export type EncryptedApiKeysData = Partial<Record<ApiKeyProvider, string>>;
