import { eq } from "drizzle-orm";

import type { ApiKeyProvider, EncryptedApiKeysData, UserSettingsData } from "~/features/settings/types";

import { encryptValue } from "~/lib/api-keys/encryption";
import { db } from "~/lib/db";
import { userSettings } from "~/lib/db/schema/settings";

const userSettingsCache = new Map<string, { data: UserSettingsData; expires: number }>();
const USER_SETTINGS_TTL = 1000 * 30;

/**
 * Get user settings by user ID (does not include actual API keys)
 *
 * @param userId ID of the user
 * @return {Promise<UserSettingsData>} User settings or default settings if not found
 */
const DEFAULT_SETTINGS: UserSettingsData = {
  theme: "dark",
  boringMode: false,
  defaultThreadName: "New Chat",
  landingPageContent: "suggestions",
  autoThreadNaming: false,
  useOcrForPdfs: false,
  sendMessageKeyboardShortcut: "enter",
  inputHeightScale: 0,
};

export async function getUserSettings(userId: string): Promise<UserSettingsData> {
  const cached = userSettingsCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.data;

  const result = await db
    .select({ settings: userSettings.settings })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!result.length) {
    return { ...DEFAULT_SETTINGS };
  }

  const settings = { ...DEFAULT_SETTINGS, ...(result[0].settings as Partial<UserSettingsData>) };
  userSettingsCache.set(userId, { data: settings, expires: Date.now() + USER_SETTINGS_TTL });
  return settings;
}

/**
 * Get user settings with metadata (does not include actual API keys)
 *
 * @param userId ID of the user
 * @return {Promise<any>} User settings record or null if not found
 */
export async function getUserSettingsWithMetadata(userId: string) {
  const result = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * Update user settings (full replacement of settings only, not API keys)
 *
 * @param userId ID of the user
 * @param newSettings New settings object
 * @return {Promise<UserSettingsData>} Updated settings
 */
export async function updateUserSettings(
  userId: string,
  newSettings: UserSettingsData,
): Promise<UserSettingsData> {
  userSettingsCache.delete(userId);

  const result = await db
    .update(userSettings)
    .set({
      settings: newSettings,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, userId))
    .returning();

  if (!result.length) {
    await db.insert(userSettings).values({
      userId,
      settings: newSettings,
      encryptedApiKeys: {},
    });

    return newSettings;
  }

  return result[0].settings as UserSettingsData;
}

/**
 * Update a specific setting field (partial update, settings only)
 *
 * @param userId ID of the user
 * @param updates Partial settings to merge
 * @return {Promise<UserSettingsData>} Updated settings
 */
export async function updateUserSettingsPartial(
  userId: string,
  updates: Partial<UserSettingsData>,
): Promise<UserSettingsData> {
  // Get current settings first
  const currentSettings = await getUserSettings(userId);

  // Merge with updates
  const merged: UserSettingsData = {
    ...currentSettings,
    ...updates,
  };

  return updateUserSettings(userId, merged);
}

/**
 * Update an API key for a provider, optionally storing it server-side encrypted
 *
 * @param userId ID of the user
 * @param provider API provider name (e.g., 'openrouter', 'parallel')
 * @param apiKey The plain API key value
 * @return {Promise<void>}
 */
export async function updateApiKey(
  userId: string,
  provider: ApiKeyProvider,
  apiKey: string,
): Promise<void> {
  const currentSettings = await getUserSettings(userId);

  const settingsResult = await db
    .select({ encryptedApiKeys: userSettings.encryptedApiKeys })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const currentEncrypted = (settingsResult[0]?.encryptedApiKeys || {}) as EncryptedApiKeysData;

  // Update encrypted keys if storing server-side
  let updatedEncrypted = currentEncrypted;
  updatedEncrypted = {
    ...currentEncrypted,
    [provider]: encryptValue(apiKey),
  };

  await db
    .update(userSettings)
    .set({
      settings: {
        ...currentSettings,
      },
      encryptedApiKeys: updatedEncrypted,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, userId));
}

/**
 * Delete an API key for a provider (removes from both client and server storage)
 *
 * @param userId ID of the user
 * @param provider API provider name (e.g., 'openrouter', 'parallel')
 * @return {Promise<void>}
 */
export async function deleteApiKey(userId: string, provider: ApiKeyProvider): Promise<void> {
  const currentSettings = await getUserSettings(userId);

  const settingsResult = await db
    .select({ encryptedApiKeys: userSettings.encryptedApiKeys })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const currentEncrypted = (settingsResult[0]?.encryptedApiKeys || {}) as EncryptedApiKeysData;

  // Remove from encrypted keys
  const cleanedEncrypted: EncryptedApiKeysData = {};
  Object.entries(currentEncrypted).forEach(([key, value]) => {
    if (key !== provider && value !== undefined) {
      cleanedEncrypted[key as "openrouter" | "parallel"] = value;
    }
  });

  await db
    .update(userSettings)
    .set({
      settings: {
        ...currentSettings,
      },
      encryptedApiKeys: cleanedEncrypted,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, userId));
}

/**
 * Remove an encrypted API key for a provider
 *
 * @param userId ID of the user
 * @param provider API provider name (e.g., 'openrouter', 'parallel')
 * @return {Promise<void>}
 */
export async function removeEncryptedKey(userId: string, provider: ApiKeyProvider): Promise<void> {
  const result = await db
    .select({ encryptedApiKeys: userSettings.encryptedApiKeys })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!result.length)
    return;

  const currentEncrypted = (result[0].encryptedApiKeys || {}) as EncryptedApiKeysData;

  // Remove the provider's encrypted key
  const cleanedEncrypted: EncryptedApiKeysData = {};
  Object.entries(currentEncrypted).forEach(([key, value]) => {
    if (key !== provider && value !== undefined) {
      cleanedEncrypted[key as keyof EncryptedApiKeysData] = value;
    }
  });

  await db
    .update(userSettings)
    .set({
      encryptedApiKeys: cleanedEncrypted,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, userId));
}
