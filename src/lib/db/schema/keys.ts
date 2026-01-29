import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
  },
  t => [index("encryption_keys_userId_idx").on(t.userId)],
);
