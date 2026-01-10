import { eq } from "drizzle-orm";

import type { ApiKeyProvider, EncryptedApiKeysData, UserSettingsData } from "~/features/settings/types";

import { db } from "~/lib/db";
import { userSettings } from "~/lib/db/schema/settings";
import { encryptValue } from "~/lib/encryption";

// Performance logging helper
function logTiming(operation: string, startTime: number, metadata?: Record<string, unknown>) {
  const duration = Date.now() - startTime;
  console.warn(`[PERF] ${operation}: ${duration}ms`, metadata ? JSON.stringify(metadata) : "");
}

/**
 * Get user settings by user ID (does not include actual API keys)
 *
 * @param userId ID of the user
 * @return {Promise<UserSettingsData>} User settings or default settings if not found
 */
export async function getUserSettings(userId: string): Promise<UserSettingsData> {
  const start = Date.now();
  const result = await db
    .select({ settings: userSettings.settings })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  logTiming("db.getUserSettings", start);

  if (!result.length) {
    // Return default settings if user settings don't exist yet
    return {
      theme: "dark",
      boringMode: false,
      defaultThreadName: "New Chat",
      landingPageContent: "suggestions",
      autoThreadNaming: false,
      apiKeyStorage: {},
    };
  }

  return result[0].settings as UserSettingsData;
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
    // Ensure apiKeyStorage is merged, not replaced
    apiKeyStorage: {
      ...currentSettings.apiKeyStorage,
      ...(updates.apiKeyStorage || {}),
    },
  };

  return updateUserSettings(userId, merged);
}

/**
 * Update an API key for a provider, optionally storing it server-side encrypted
 *
 * @param userId ID of the user
 * @param provider API provider name (e.g., 'openrouter', 'parallel')
 * @param apiKey The plain API key value
 * @param storeServerSide Whether to store it encrypted on the server (default: false)
 * @return {Promise<void>}
 */
export async function updateApiKey(
  userId: string,
  provider: ApiKeyProvider,
  apiKey: string,
  storeServerSide: boolean = false,
): Promise<void> {
  const currentSettings = await getUserSettings(userId);

  const settingsResult = await db
    .select({ encryptedApiKeys: userSettings.encryptedApiKeys })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const currentEncrypted = (settingsResult[0]?.encryptedApiKeys || {}) as EncryptedApiKeysData;

  // Update storage preference
  const updatedApiKeyStorage = {
    ...currentSettings.apiKeyStorage,
    [provider]: storeServerSide ? "server" : "client",
  };

  // Update encrypted keys if storing server-side
  let updatedEncrypted = currentEncrypted;
  if (storeServerSide) {
    updatedEncrypted = {
      ...currentEncrypted,
      [provider]: encryptValue(apiKey),
    };
  }
  else {
    // Remove from server storage if switching to client
    const cleanedEncrypted: EncryptedApiKeysData = {};
    Object.entries(currentEncrypted).forEach(([key, value]) => {
      if (key !== provider && value !== undefined) {
        cleanedEncrypted[key as "openrouter" | "parallel"] = value;
      }
    });
    updatedEncrypted = cleanedEncrypted;
  }

  await db
    .update(userSettings)
    .set({
      settings: {
        ...currentSettings,
        apiKeyStorage: updatedApiKeyStorage,
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

  // Remove from storage preferences
  const cleanedApiKeyStorage: Record<string, "client" | "server"> = {};
  Object.entries(currentSettings.apiKeyStorage).forEach(([key, value]) => {
    if (key !== provider && value !== undefined) {
      cleanedApiKeyStorage[key] = value;
    }
  });

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
        apiKeyStorage: cleanedApiKeyStorage,
      },
      encryptedApiKeys: cleanedEncrypted,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, userId));
}

/**
 * Remove a provider from apiKeyStorage (when client-side key is missing)
 *
 * @param userId ID of the user
 * @param provider API provider name (e.g., 'openrouter', 'parallel')
 * @return {Promise<void>}
 */
export async function removeApiKeyPreference(userId: string, provider: ApiKeyProvider): Promise<void> {
  const currentSettings = await getUserSettings(userId);

  // Remove provider from storage preferences
  const cleanedApiKeyStorage: Record<string, "client" | "server"> = {};
  Object.entries(currentSettings.apiKeyStorage).forEach(([key, value]) => {
    if (key !== provider && value !== undefined) {
      cleanedApiKeyStorage[key] = value;
    }
  });

  await db
    .update(userSettings)
    .set({
      settings: {
        ...currentSettings,
        apiKeyStorage: cleanedApiKeyStorage,
      },
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
