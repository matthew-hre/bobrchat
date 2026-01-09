import { z } from "zod";

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

export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type PreferencesUpdate = Partial<PreferencesInput>;

/**
 * Partial preferences for updates (all fields optional)
 */
export const preferencesUpdateSchema = preferencesSchema.partial();

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
 * Profile tab - user information updates
 */
export const profileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.email("Invalid email address").optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileUpdate = Partial<ProfileInput>;

/**
 * Partial profile for updates (all fields optional)
 */
export const profileUpdateSchema = profileSchema.partial();

/**
 * Models tab - favorite models management
 */
export const favoriteModelsSchema = z.object({
  favoriteModels: z.array(z.string()).max(10, "Maximum 10 models allowed"),
});

export type FavoriteModelsInput = z.infer<typeof favoriteModelsSchema>;

/**
 * Partial favorite models for updates
 */
export const favoriteModelsUpdateSchema = favoriteModelsSchema.partial();
