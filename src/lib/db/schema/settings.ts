import { defineRelations } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth";

/**
 * Supported API key providers.
 * Add new providers here to extend support across the application.
 */
export type ApiKeyProvider = "openrouter" | "parallel";

export type LandingPageContentType = "suggestions" | "greeting" | "blank";

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
};

// Storage for encrypted API keys (only populated if user opts into server storage)
// Values are in "hex(iv):hex(ciphertext):hex(authTag)" format
export type EncryptedApiKeysData = Partial<Record<ApiKeyProvider, string>>;

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    settings: jsonb("settings").notNull().default({
      theme: "dark",
      boringMode: false,
      defaultThreadName: "New Chat",
      landingPageContent: "suggestions",
      autoThreadNaming: false,
      apiKeyStorage: {},
    } as UserSettingsData),
    encryptedApiKeys: jsonb("encrypted_api_keys").notNull().default({} as EncryptedApiKeysData),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [index("user_settings_userId_idx").on(table.userId)],
);

export const userSettingsRelations = defineRelations({ userSettings, users }, r => ({
  userSettings: {
    user: r.one.users({
      from: r.userSettings.userId,
      to: r.users.id,
    }),
  },
}));
