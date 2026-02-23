"use server";

import { eq } from "drizzle-orm";

import { getRequiredSession, getSession } from "~/features/auth/lib/session";
import { hasEncryptedKey } from "~/lib/api-keys/server";
import { db } from "~/lib/db";
import { threads } from "~/lib/db/schema";

import type { ApiKeyProvider, FavoriteModelsInput, PreferencesUpdate, ProfileUpdate, UserSettingsData } from "./types";

import {
  deleteApiKey as deleteApiKeyQuery,
  getUserSettings,
  getUserSettingsAndKeys,
  updateApiKey as updateApiKeyQuery,
  updateUserSettings,
  updateUserSettingsPartial,
} from "./queries";
import {
  apiKeyUpdateSchema,
  favoriteModelsUpdateSchema,
  preferencesUpdateSchema,
  profileUpdateSchema,
} from "./types";

/**
 * Update user preferences (theme, custom instructions, default thread name, landing page content)
 * Requires authentication and ownership verification
 *
 * @param updates Partial preferences to update (type-safe via PreferencesUpdate)
 * @return {Promise<void>}
 * @throws {Error} If not authenticated or validation fails
 */
export async function updatePreferences(updates: PreferencesUpdate): Promise<UserSettingsData> {
  // Validate input with Zod
  const validated = preferencesUpdateSchema.parse(updates);

  // Get authenticated session
  const session = await getRequiredSession();

  // Update settings in database and return the updated settings
  return updateUserSettingsPartial(session.user.id, validated);
}

/**
 * Update API key for a provider with server-side encryption storage
 * Requires authentication and ownership verification
 *
 * @param provider API provider name (e.g., 'openrouter', 'parallel')
 * @param apiKey The API key to store
 * @return {Promise<void>}
 * @throws {Error} If not authenticated or validation fails
 */
export async function updateApiKey(
  provider: ApiKeyProvider,
  apiKey: string,
): Promise<void> {
  // Validate inputs with Zod
  const validated = apiKeyUpdateSchema.parse({
    apiKey,
  });

  // Get authenticated session
  const session = await getRequiredSession();

  // Update API key in database
  await updateApiKeyQuery(
    session.user.id,
    provider,
    validated.apiKey,
  );
}

/**
 * Delete an API key for a provider
 * Requires authentication and ownership verification
 *
 * @param provider API provider name (e.g., 'openrouter', 'parallel')
 * @return {Promise<void>}
 * @throws {Error} If not authenticated
 */
export async function deleteApiKey(provider: ApiKeyProvider): Promise<void> {
  // Get authenticated session
  const session = await getRequiredSession();

  // Delete API key from database
  await deleteApiKeyQuery(session.user.id, provider);
}

/**
 * Create default settings for a new user
 *
 * @param userId ID of the user
 * @return {Promise<UserSettingsData>} Created user settings
 */
export async function createDefaultUserSettings(userId: string): Promise<UserSettingsData> {
  const defaultSettings: UserSettingsData = {
    theme: "dark",
    accentColor: "green",
    defaultThreadName: "New Thread",
    defaultThreadIcon: "message-circle",
    autoThreadNaming: false,
    autoThreadIcon: false,
    showSidebarIcons: false,
    useOcrForPdfs: false,
    autoCreateFilesFromPaste: true,
    landingPageContent: "suggestions",
    sendMessageKeyboardShortcut: "enter",
    inputHeightScale: 0,
    profileCardWidget: "apiKeyStatus",
  };

  await updateUserSettings(userId, defaultSettings);

  return defaultSettings;
}

/**
 * Sync user settings and clean up orphaned data
 * Cleanup is performed lazily (roughly 1 in 10 calls) to reduce DB overhead
 * Requires authentication
 *
 * @return {Promise<UserSettingsData | null>} Fresh user settings after cleanup, or null if not authenticated
 */
export async function syncUserSettings(): Promise<UserSettingsData | null> {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  // Return fresh settings with configured API keys info
  const [settings, hasOpenRouter, hasParallel] = await Promise.all([
    getUserSettings(session.user.id),
    hasEncryptedKey(session.user.id, "openrouter"),
    hasEncryptedKey(session.user.id, "parallel"),
  ]);

  return {
    ...settings,
    configuredApiKeys: {
      openrouter: hasOpenRouter,
      parallel: hasParallel,
    },
  };
}

/**
 * Update user's favorite models list (max 10)
 * Requires authentication
 *
 * @param updates Partial update with favoriteModels array
 * @return {Promise<UserSettingsData>} Updated user settings
 * @throws {Error} If not authenticated or validation fails
 */
export async function updateFavoriteModels(updates: FavoriteModelsInput): Promise<UserSettingsData> {
  // Validate input with Zod
  const validated = favoriteModelsUpdateSchema.parse(updates);

  // Get authenticated session
  const session = await getRequiredSession();

  // Update settings in database
  return updateUserSettingsPartial(session.user.id, validated);
}

/**
 * Delete all threads for the authenticated user
 * Messages and attachments are cascade-deleted via foreign key constraints
 * Requires authentication
 *
 * @return {Promise<{ deletedCount: number }>} Number of threads deleted
 * @throws {Error} If not authenticated
 */
export async function deleteAllThreads(): Promise<{ deletedCount: number }> {
  const session = await getRequiredSession();

  const result = await db
    .delete(threads)
    .where(eq(threads.userId, session.user.id))
    .returning();

  return { deletedCount: Array.isArray(result) ? result.length : 0 };
}

/**
 * Fetch OpenRouter remaining credits using the SDK.
 * Fires both apiKeys.getCurrentKeyMetadata() and credits.getCredits() in parallel.
 * If the key has a spending limit, returns limitRemaining from the key metadata.
 * Otherwise falls back to total_credits - total_usage from the credits endpoint.
 */
export async function getOpenRouterCredits(params?: { openrouterClientKey?: string }) {
  const session = await getRequiredSession();

  const { resolvedKeys } = await getUserSettingsAndKeys(
    session.user.id,
    params?.openrouterClientKey ? { openrouter: params.openrouterClientKey } : undefined,
  );

  const key = resolvedKeys.openrouter;
  if (!key) {
    throw new Error("No OpenRouter key configured");
  }

  const { OpenRouter } = await import("@openrouter/sdk");
  const openRouter = new OpenRouter({ apiKey: key });

  const [keyMeta, creditsRes] = await Promise.all([
    openRouter.apiKeys.getCurrentKeyMetadata(),
    fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    }),
  ]);

  if (keyMeta.data.limitRemaining !== null) {
    return { remaining: keyMeta.data.limitRemaining };
  }

  if (!creditsRes.ok) {
    throw new Error(`OpenRouter credits request failed (${creditsRes.status})`);
  }

  const creditsJson = (await creditsRes.json()) as {
    data: { total_credits: number; total_usage: number };
  };

  return {
    remaining: creditsJson.data.total_credits - creditsJson.data.total_usage,
  };
}
