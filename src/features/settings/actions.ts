"use server";

import { headers } from "next/headers";

import { auth } from "~/features/auth/lib/auth";
import { hasKeyConfigured } from "~/lib/api-keys/server";

import type { ApiKeyProvider, EncryptedApiKeysData, FavoriteModelsInput, PreferencesUpdate, ProfileUpdate, UserSettingsData } from "./types";

import {
  deleteApiKey as deleteApiKeyQuery,
  getUserSettings,
  getUserSettingsWithMetadata,
  removeApiKeyPreference,
  removeEncryptedKey,
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
export async function updatePreferences(updates: PreferencesUpdate): Promise<void> {
  // Validate input with Zod
  const validated = preferencesUpdateSchema.parse(updates);

  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  // Update settings in database
  await updateUserSettingsPartial(session.user.id, validated);
}

/**
 * Update API key for a provider with optional server-side encryption storage
 * Requires authentication and ownership verification
 *
 * @param provider API provider name (e.g., 'openrouter', 'parallel')
 * @param apiKey The API key to store
 * @param storeServerSide Whether to encrypt and store on server (default: false)
 * @return {Promise<void>}
 * @throws {Error} If not authenticated or validation fails
 */
export async function updateApiKey(
  provider: ApiKeyProvider,
  apiKey: string,
  storeServerSide: boolean = false,
): Promise<void> {
  // Validate inputs with Zod
  const validated = apiKeyUpdateSchema.parse({
    apiKey,
    storeServerSide,
  });

  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  // Update API key in database
  await updateApiKeyQuery(
    session.user.id,
    provider,
    validated.apiKey,
    validated.storeServerSide,
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  // Delete API key from database
  await deleteApiKeyQuery(session.user.id, provider);
}

/**
 * Update user profile (name, email)
 * Requires authentication and ownership verification
 *
 * @param updates Partial profile to update (type-safe via ProfileUpdate)
 * @return {Promise<void>}
 * @throws {Error} If not authenticated or validation fails
 */
export async function updateProfile(updates: ProfileUpdate): Promise<void> {
  // Validate input with Zod
  const _validated = profileUpdateSchema.parse(updates);

  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  // TODO: Implement profile update in database
  throw new Error("Profile updates are not yet implemented");
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
    boringMode: false,
    defaultThreadName: "New Chat",
    autoThreadNaming: false,
    landingPageContent: "suggestions",
    sendMessageKeyboardShortcut: "enter",
    apiKeyStorage: {},
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  // Lazy cleanup: only run ~10% of the time to reduce DB overhead
  // Orphaned keys are rare and not critical to clean up immediately
  if (Math.random() < 0.1) {
    await cleanupEncryptedApiKeysForUser(session.user.id);
  }

  // Return fresh settings with configured API keys info
  const [settings, hasOpenRouter, hasParallel] = await Promise.all([
    getUserSettings(session.user.id),
    hasKeyConfigured(session.user.id, "openrouter"),
    hasKeyConfigured(session.user.id, "parallel"),
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
 * Clean up missing client-side API key (when localStorage key is not found)
 * Removes the provider from apiKeyStorage preferences in database
 * Requires authentication
 *
 * @param provider API provider name (e.g., 'openrouter')
 * @return {Promise<void>}
 * @throws {Error} If not authenticated
 */
export async function cleanupMissingClientApiKey(provider: ApiKeyProvider): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  await removeApiKeyPreference(session.user.id, provider);
}

/**
 * Internal helper to clean up orphaned encrypted API keys for a specific user
 * Does not check authentication - caller must verify
 *
 * @param userId ID of the user
 * @return {Promise<void>}
 */
async function cleanupEncryptedApiKeysForUser(userId: string): Promise<void> {
  // Fetch user settings with metadata to check encrypted keys
  const userRecord = await getUserSettingsWithMetadata(userId);
  if (!userRecord) {
    return;
  }

  const settings = userRecord.settings as UserSettingsData;
  const encryptedApiKeys = (userRecord.encryptedApiKeys || {}) as EncryptedApiKeysData;

  // Find and remove encrypted keys that don't have a matching "server" storage preference
  const cleanupPromises: Promise<void>[] = [];
  for (const provider of Object.keys(encryptedApiKeys) as ApiKeyProvider[]) {
    if (settings.apiKeyStorage[provider] !== "server") {
      // This encrypted key doesn't have a matching server preference, remove it
      cleanupPromises.push(removeEncryptedKey(userId, provider));
    }
  }

  if (cleanupPromises.length > 0) {
    await Promise.all(cleanupPromises);
  }
}

/**
 * Clean up orphaned encrypted API keys (keys without matching storage preferences)
 * Queries user settings and removes any encrypted keys that don't have a matching
 * "server" storage preference in apiKeyStorage
 * Requires authentication
 *
 * @return {Promise<void>}
 * @throws {Error} If not authenticated
 */
export async function cleanupEncryptedApiKeys(): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  await cleanupEncryptedApiKeysForUser(session.user.id);
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  // Update settings in database
  return updateUserSettingsPartial(session.user.id, validated);
}
