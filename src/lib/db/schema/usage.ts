import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth";

export const utilityUsage = pgTable(
  "utility_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "title" | "icon" | "metadata" | "tags" | "handoff"
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costTotalUsd: text("cost_total_usd"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [
    index("utility_usage_userId_idx").on(table.userId),
    index("utility_usage_userId_createdAt_idx").on(table.userId, table.createdAt),
  ],
);
