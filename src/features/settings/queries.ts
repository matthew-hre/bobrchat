import { eq } from "drizzle-orm";

import type { ApiKeyProvider, EncryptedApiKeysData, UserSettingsData } from "~/features/settings/types";

import { decryptValue, encryptValue } from "~/lib/api-keys/encryption";
import { db } from "~/lib/db";
import { userSettings } from "~/lib/db/schema/settings";

const DEFAULT_SETTINGS: UserSettingsData = {
  theme: "dark",
  accentColor: "green",
  defaultThreadName: "New Chat",
  defaultThreadIcon: "message-circle",
  landingPageContent: "suggestions",
  autoThreadNaming: false,
  autoThreadIcon: false,
  showSidebarIcons: false,
  useOcrForPdfs: false,
  autoCreateFilesFromPaste: true,
  sendMessageKeyboardShortcut: "enter",
  inputHeightScale: 0,
  profileCardWidget: "apiKeyStatus",
};

export type ResolvedUserData = {
  settings: UserSettingsData;
  resolvedKeys: {
    openrouter?: string;
    parallel?: string;
  };
};

async function getUserSettingsRow(userId: string) {
  const result = await db
    .select({
      settings: userSettings.settings,
      encryptedApiKeys: userSettings.encryptedApiKeys,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!result.length) {
    return { settings: { ...DEFAULT_SETTINGS }, encryptedApiKeys: {} as EncryptedApiKeysData };
  }

  return {
    settings: { ...DEFAULT_SETTINGS, ...(result[0].settings as Partial<UserSettingsData>) },
    encryptedApiKeys: (result[0].encryptedApiKeys ?? {}) as EncryptedApiKeysData,
  };
}

/**
 * Fetch user settings and resolve API keys in a single DB query.
 * Client-provided keys take precedence over server-stored keys.
 *
 * @param userId ID of the user
 * @param clientKeys Optional client-provided keys (from localStorage)
 * @param clientKeys.openrouter OpenRouter API key from client
 * @param clientKeys.parallel Parallel API key from client
 * @returns Settings and resolved API keys
 */
export async function getUserSettingsAndKeys(
  userId: string,
  clientKeys?: { openrouter?: string; parallel?: string },
): Promise<ResolvedUserData> {
  const { settings, encryptedApiKeys } = await getUserSettingsRow(userId);

  const resolvedKeys: ResolvedUserData["resolvedKeys"] = {};

  if (clientKeys?.openrouter) {
    resolvedKeys.openrouter = clientKeys.openrouter;
  }
  else if (encryptedApiKeys.openrouter) {
    try {
      resolvedKeys.openrouter = decryptValue(encryptedApiKeys.openrouter);
    }
    catch (error) {
      console.error(`Failed to decrypt openrouter API key for user ${userId}:`, error);
    }
  }

  if (clientKeys?.parallel) {
    resolvedKeys.parallel = clientKeys.parallel;
  }
  else if (encryptedApiKeys.parallel) {
    try {
      resolvedKeys.parallel = decryptValue(encryptedApiKeys.parallel);
    }
    catch (error) {
      console.error(`Failed to decrypt parallel API key for user ${userId}:`, error);
    }
  }

  return { settings, resolvedKeys };
}

/**
 * Get user settings by user ID (does not include actual API keys)
 * Cached per-request to deduplicate multiple calls.
 *
 * @param userId ID of the user
 * @return {Promise<UserSettingsData>} User settings or default settings if not found
 */
export async function getUserSettings(userId: string): Promise<UserSettingsData> {
  const { settings } = await getUserSettingsRow(userId);
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
