import { boolean, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth";

export const keys = pgTable(
  "encryption_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    version: integer("key_version").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    rotatedAt: timestamp("rotated_at"),
    salt: text("key_salt").notNull(),
    rotationInProgress: boolean("rotation_in_progress").default(false),
  },
  t => [index("encryption_keys_userId_idx").on(t.userId)],
);

export const keySalts = pgTable(
  "key_salts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    salt: text("salt").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  t => [
    index("key_salts_user_version_idx").on(t.userId, t.version),
    unique("key_salts_user_version_unique").on(t.userId, t.version),
  ],
);
