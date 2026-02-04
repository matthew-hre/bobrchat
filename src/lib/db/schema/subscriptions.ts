import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth";

export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "beta", "plus", "pro"]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: subscriptionTierEnum("tier").notNull().default("free"),
    polarCustomerId: text("polar_customer_id"),
    polarSubscriptionId: text("polar_subscription_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index("subscriptions_userId_idx").on(table.userId),
    index("subscriptions_polarCustomerId_idx").on(table.polarCustomerId),
  ],
);

export type SubscriptionTier = (typeof subscriptionTierEnum.enumValues)[number];

export const TIER_LIMITS: Record<SubscriptionTier, { threads: number | null; storageBytes: number }> = {
  free: { threads: 100, storageBytes: 10 * 1024 * 1024 },
  beta: { threads: null, storageBytes: 100 * 1024 * 1024 },
  plus: { threads: null, storageBytes: 100 * 1024 * 1024 },
  pro: { threads: null, storageBytes: 1024 * 1024 * 1024 },
};

export const userStorageConfigs = pgTable(
  "user_storage_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["r2", "s3"] }).notNull(),
    bucket: text("bucket").notNull(),
    region: text("region"),
    endpoint: text("endpoint"),
    accessKeyId: text("access_key_id").notNull(),
    secretAccessKey: text("secret_access_key").notNull(),
    publicUrl: text("public_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [index("user_storage_configs_userId_idx").on(table.userId)],
);
