import { and, eq, sql } from "drizzle-orm";

import type { EncryptedApiKeysData } from "~/features/settings/types";

import { db } from "~/lib/db";
import { userSettings } from "~/lib/db/schema/settings";
import { decryptValue } from "~/lib/encryption";

import type { ApiKeyProvider } from "./types";

/**
 * Get a server-stored (encrypted) API key for a provider.
 *
 * @param userId ID of the user
 * @param provider API provider name
 * @returns The decrypted API key or undefined if not stored on server
 * @throws If decryption fails (corrupted data or wrong key)
 */
export async function getEncryptedKey(
  userId: string,
  provider: ApiKeyProvider,
): Promise<string | undefined> {
  const result = await db
    .select({ encryptedApiKeys: userSettings.encryptedApiKeys })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!result.length) {
    return undefined;
  }

  const encrypted = (result[0].encryptedApiKeys as EncryptedApiKeysData)[provider];
  if (!encrypted) {
    return undefined;
  }

  try {
    return decryptValue(encrypted);
  }
  catch (error) {
    console.error(`Failed to decrypt ${provider} API key for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check if user has an API key configured for a provider (either client or server).
 * This checks the user's storage preference, and for server-stored keys,
 * verifies the encrypted key actually exists.
 *
 * Note: For client-stored keys, this only verifies the preference is set.
 * The server cannot verify the key actually exists in the browser.
 *
 * @param userId ID of the user
 * @param provider API provider name
 * @returns True if user has a key configured
 */
export async function hasKeyConfigured(
  userId: string,
  provider: ApiKeyProvider,
): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`1` })
    .from(userSettings)
    .where(and(
      eq(userSettings.userId, userId),
      sql`(${userSettings.settings}->'apiKeyStorage'->>${sql.raw(`'${provider}'`)}) IS NOT NULL`,
      sql`
        CASE 
          WHEN (${userSettings.settings}->'apiKeyStorage'->>${sql.raw(`'${provider}'`)}) = 'server' 
          THEN (${userSettings.encryptedApiKeys}->>${sql.raw(`'${provider}'`)}) IS NOT NULL
          ELSE true
        END
      `,
    ))
    .limit(1);

  return result.length > 0;
}

/**
 * Resolve the effective API key for a provider.
 * Client-provided keys take precedence over server-stored keys.
 *
 * @param userId ID of the user
 * @param provider API provider name
 * @param clientKey Optional key provided by the client (from localStorage)
 * @returns The resolved API key or undefined if none available
 */
export async function resolveKey(
  userId: string,
  provider: ApiKeyProvider,
  clientKey?: string,
): Promise<string | undefined> {
  if (clientKey) {
    return clientKey;
  }
  return getEncryptedKey(userId, provider);
}
