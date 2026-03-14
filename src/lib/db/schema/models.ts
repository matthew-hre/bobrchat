import { index, integer, jsonb, pgTable, real, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/**
 * Cached OpenRouter models table
 *
 * Stores models fetched from OpenRouter API for fast local queries.
 * Refreshed periodically via cron job.
 */
export const models = pgTable(
  "models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelId: text("model_id").notNull().unique(),
    canonicalSlug: text("canonical_slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    provider: text("provider").notNull(),
    contextLength: integer("context_length"),
    created: integer("created").notNull(),

    // Pricing (stored as real for efficient queries, originally strings)
    pricingPrompt: real("pricing_prompt"),
    pricingCompletion: real("pricing_completion"),
    pricingImage: real("pricing_image"),
    pricingRequest: real("pricing_request"),

    // Architecture & capabilities (denormalized for filtering)
    inputModalities: text("input_modalities").array().notNull().default([]),
    outputModalities: text("output_modalities").array().notNull().default([]),
    supportedParameters: text("supported_parameters").array().notNull().default([]),

    // Full model data for compatibility with existing code
    rawData: jsonb("raw_data").notNull(),

    // Metadata
    lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [
    index("models_provider_idx").on(table.provider),
    index("models_name_idx").on(table.name),
    index("models_context_length_idx").on(table.contextLength),
    index("models_pricing_prompt_idx").on(table.pricingPrompt),
  ],
);

/**
 * Tracks when the models cache was last refreshed
 */
export const modelsSyncStatus = pgTable("models_sync_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  modelCount: integer("model_count").notNull().default(0),
  syncDurationMs: integer("sync_duration_ms"),
  error: text("error"),
});

/**
 * Tracks which direct providers (e.g. OpenAI, Anthropic) offer each model,
 * enabling routing requests through direct providers with OpenRouter as fallback.
 */
export const modelProviderAvailability = pgTable(
  "model_provider_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelId: text("model_id").notNull().references(() => models.modelId),
    provider: text("provider").notNull(),
    providerModelId: text("provider_model_id").notNull(),
    lastVerifiedAt: timestamp("last_verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [
    unique("model_provider_availability_model_id_provider_unique").on(table.modelId, table.provider),
    index("model_provider_availability_provider_idx").on(table.provider),
  ],
);

export type DbModel = typeof models.$inferSelect;
export type DbModelInsert = typeof models.$inferInsert;
