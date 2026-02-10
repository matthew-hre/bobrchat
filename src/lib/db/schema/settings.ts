import { defineRelations } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import type { EncryptedApiKeysData, UserSettingsData } from "~/features/settings/types";

import { users } from "./auth";

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
      accentColor: "green",
      defaultThreadName: "New Chat",
      defaultThreadIcon: "message-circle",
      landingPageContent: "suggestions",
      sendMessageKeyboardShortcut: "enter",
      autoThreadNaming: false,
      autoThreadIcon: false,
      showSidebarIcons: false,
      useOcrForPdfs: false,
      autoCreateFilesFromPaste: true,
      inputHeightScale: 0,
      hideModelProviderNames: false,
      profileCardWidget: "apiKeyStatus",
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
