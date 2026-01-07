import { relations } from "drizzle-orm";
import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth";

export type LandingPageContentType = "suggestions" | "greeting" | "blank";

export type UserSettingsData = {
  theme: "dark" | "light" | "system";
  customInstructions?: string;
  defaultThreadName: string;
  landingPageContent: LandingPageContentType;
  // Tracks which API key providers have server-side encrypted storage enabled
  // 'client' = stored in browser localStorage, 'server' = stored encrypted on server
  apiKeyStorage: {
    openrouter?: "client" | "server";
    parallel?: "client" | "server";
  };
  // List of favorite model IDs from OpenRouter (max 10)
  favoriteModels?: string[];
};

// Storage for encrypted API keys (only populated if user opts into server storage)
export type EncryptedApiKeysData = {
  openrouter?: string; // Encrypted value in "iv:encryptedData:authTag" format
  parallel?: string; // Encrypted value in "iv:encryptedData:authTag" format
};

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  settings: jsonb("settings").notNull().default({
    theme: "dark",
    defaultThreadName: "New Chat",
    landingPageContent: "suggestions",
    apiKeyStorage: {},
  } as UserSettingsData),
  // Encrypted API keys - only contains keys where apiKeyStorage[provider] === 'server'
  encryptedApiKeys: jsonb("encrypted_api_keys").notNull().default({} as EncryptedApiKeysData),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));
