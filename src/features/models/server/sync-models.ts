"use server";

import type { Model } from "@openrouter/sdk/models";

import { OpenRouter } from "@openrouter/sdk";
import { and, desc, eq } from "drizzle-orm";

import { db } from "~/lib/db";
import { modelProviderAvailability, models, modelsSyncStatus } from "~/lib/db/schema";
import { serverEnv } from "~/lib/env";

/**
 * Convert OpenRouter Model to database insert format
 */
function modelToDbInsert(model: Model) {
  const [provider] = model.id.split("/");

  return {
    modelId: model.id,
    canonicalSlug: model.canonicalSlug,
    name: model.name,
    description: model.description ?? null,
    provider: provider ?? "unknown",
    contextLength: model.contextLength,
    created: model.created,

    pricingPrompt: model.pricing.prompt ? Number(model.pricing.prompt) : null,
    pricingCompletion: model.pricing.completion ? Number(model.pricing.completion) : null,
    pricingImage: model.pricing.image ? Number(model.pricing.image) : null,
    pricingRequest: model.pricing.request ? Number(model.pricing.request) : null,

    inputModalities: model.architecture.inputModalities ?? [],
    outputModalities: model.architecture.outputModalities ?? [],
    supportedParameters: model.supportedParameters ?? [],

    rawData: model as unknown as Record<string, unknown>,
    lastSyncedAt: new Date(),
  };
}

/**
 * Fetch models from OpenRouter API and sync to database
 * Uses server-stored API key (not user-specific)
 */
export async function syncModelsFromOpenRouter(): Promise<{
  success: boolean;
  modelCount: number;
  durationMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const openrouterKey = serverEnv.OPENROUTER_API_KEY;

    if (!openrouterKey) {
      throw new Error("OPENROUTER_API_KEY not configured on server");
    }

    const openRouter = new OpenRouter({ apiKey: openrouterKey });
    const result = await openRouter.models.list({});

    if (!result || !Array.isArray(result.data)) {
      throw new Error("Invalid response from OpenRouter API");
    }

    // Filter out image-output models and auto-router
    const filteredModels = result.data.filter((model: Model) => {
      return !(model.architecture?.outputModalities?.includes("image"))
        && !(model.id === "openrouter/auto");
    });

    // Upsert all models
    const now = new Date();
    for (const model of filteredModels) {
      const insert = modelToDbInsert(model);
      await db
        .insert(models)
        .values(insert)
        .onConflictDoUpdate({
          target: models.modelId,
          set: {
            ...insert,
            lastSyncedAt: now,
          },
        });
    }

    // Delete models that no longer exist in OpenRouter
    const currentModelIds = new Set(filteredModels.map((m: Model) => m.id));
    const existingModels = await db.select({ modelId: models.modelId }).from(models);
    for (const existing of existingModels) {
      if (!currentModelIds.has(existing.modelId)) {
        await db.delete(models).where(eq(models.modelId, existing.modelId));
      }
    }

    const durationMs = Date.now() - startTime;

    // Record sync status
    await db.insert(modelsSyncStatus).values({
      lastSyncedAt: now,
      modelCount: filteredModels.length,
      syncDurationMs: durationMs,
    });

    return {
      success: true,
      modelCount: filteredModels.length,
      durationMs,
    };
  }
  catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Record failed sync
    await db.insert(modelsSyncStatus).values({
      lastSyncedAt: new Date(),
      modelCount: 0,
      syncDurationMs: durationMs,
      error: errorMessage,
    });

    console.error("Failed to sync models from OpenRouter:", error);

    return {
      success: false,
      modelCount: 0,
      durationMs,
      error: errorMessage,
    };
  }
}

/**
 * Check if an OpenRouter model ID is an OpenRouter-only variant
 * that should not be mapped to a direct provider.
 */
function isOpenRouterOnlyVariant(strippedId: string): boolean {
  return strippedId.includes(":")
    || strippedId.endsWith("-high")
    || strippedId.includes("-chat")
    || strippedId.startsWith("gpt-oss-");
}

/**
 * Sync direct provider availability for models.
 * Fetches the OpenAI model list and cross-references with our models table
 * to determine which models can be routed directly through OpenAI.
 */
export async function syncDirectProviderAvailability(): Promise<{
  success: boolean;
  upserted: number;
  removed: number;
  durationMs: number;
  skipped?: boolean;
  error?: string;
}> {
  const startTime = Date.now();

  const openaiKey = serverEnv.OPENAI_API_KEY;
  if (!openaiKey) {
    return {
      success: true,
      upserted: 0,
      removed: 0,
      durationMs: Date.now() - startTime,
      skipped: true,
    };
  }

  try {
    // Fetch OpenAI's model list
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${openaiKey}` },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as { data: { id: string }[] };
    const openaiModelIds = new Set(data.data.map(m => m.id));

    // Get all OpenAI models from our models table
    const openaiModels = await db
      .select({ modelId: models.modelId })
      .from(models)
      .where(eq(models.provider, "openai"));

    let upserted = 0;
    let removed = 0;
    const now = new Date();

    for (const { modelId } of openaiModels) {
      const strippedId = modelId.replace(/^openai\//, "");

      if (isOpenRouterOnlyVariant(strippedId)) {
        continue;
      }

      if (openaiModelIds.has(strippedId)) {
        await db
          .insert(modelProviderAvailability)
          .values({
            modelId,
            provider: "openai",
            providerModelId: strippedId,
            lastVerifiedAt: now,
          })
          .onConflictDoUpdate({
            target: [modelProviderAvailability.modelId, modelProviderAvailability.provider],
            set: {
              providerModelId: strippedId,
              lastVerifiedAt: now,
            },
          });
        upserted++;
      }
      else {
        await db
          .delete(modelProviderAvailability)
          .where(
            and(
              eq(modelProviderAvailability.modelId, modelId),
              eq(modelProviderAvailability.provider, "openai"),
            ),
          );
        removed++;
      }
    }

    return {
      success: true,
      upserted,
      removed,
      durationMs: Date.now() - startTime,
    };
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to sync direct provider availability:", error);

    return {
      success: false,
      upserted: 0,
      removed: 0,
      durationMs: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Finds the best matching Anthropic API model ID for a stripped OpenRouter ID.
 *
 * OpenRouter uses short IDs (e.g. "claude-sonnet-4") while Anthropic's API
 * returns date-suffixed IDs (e.g. "claude-sonnet-4-20250514") or versionless
 * IDs (e.g. "claude-sonnet-4-6"). Matches by prefix, preferring exact matches,
 * then the latest date-suffixed variant.
 */
function findAnthropicModelMatch(strippedId: string, apiModelIds: string[]): string | undefined {
  // OpenRouter uses dots (e.g. "claude-3.5-sonnet") while Anthropic uses
  // dashes (e.g. "claude-3-5-sonnet"). Normalize dots to dashes for matching.
  const normalized = strippedId.replaceAll(".", "-");

  for (const id of [strippedId, normalized]) {
    const exact = apiModelIds.find(apiId => apiId === id);
    if (exact)
      return exact;

    const candidates = apiModelIds
      .filter(apiId => apiId.startsWith(`${id}-`))
      .sort();

    if (candidates.length > 0)
      return candidates[candidates.length - 1];
  }

  return undefined;
}

/**
 * Sync direct provider availability for Anthropic models.
 * Fetches the Anthropic model list and cross-references with our models table
 * to determine which models can be routed directly through Anthropic.
 */
export async function syncAnthropicProviderAvailability(): Promise<{
  success: boolean;
  upserted: number;
  removed: number;
  durationMs: number;
  skipped?: boolean;
  error?: string;
}> {
  const startTime = Date.now();

  const anthropicKey = serverEnv.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return {
      success: true,
      upserted: 0,
      removed: 0,
      durationMs: Date.now() - startTime,
      skipped: true,
    };
  }

  try {
    // Fetch all Anthropic models with pagination
    const anthropicApiModelIds: string[] = [];
    let afterId: string | undefined;

    while (true) {
      const url = new URL("https://api.anthropic.com/v1/models");
      if (afterId) {
        url.searchParams.set("after_id", afterId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
      });

      if (!response.ok) {
        throw new Error(`Anthropic API returned ${response.status}: ${await response.text()}`);
      }

      const data = await response.json() as {
        data: { id: string }[];
        has_more: boolean;
        last_id: string;
      };

      for (const model of data.data) {
        anthropicApiModelIds.push(model.id);
      }

      if (!data.has_more) {
        break;
      }
      afterId = data.last_id;
    }

    // Get all Anthropic models from our models table
    const anthropicModels = await db
      .select({ modelId: models.modelId })
      .from(models)
      .where(eq(models.provider, "anthropic"));

    let upserted = 0;
    let removed = 0;
    const now = new Date();

    for (const { modelId } of anthropicModels) {
      const strippedId = modelId.replace(/^anthropic\//, "");

      if (isOpenRouterOnlyVariant(strippedId)) {
        continue;
      }

      // Anthropic API returns date-suffixed IDs (e.g. "claude-sonnet-4-20250514")
      // while OpenRouter uses short IDs (e.g. "anthropic/claude-sonnet-4").
      // Match by finding an API model whose ID starts with the stripped local ID.
      const matchedApiId = findAnthropicModelMatch(strippedId, anthropicApiModelIds);

      if (matchedApiId) {
        await db
          .insert(modelProviderAvailability)
          .values({
            modelId,
            provider: "anthropic",
            providerModelId: matchedApiId,
            lastVerifiedAt: now,
          })
          .onConflictDoUpdate({
            target: [modelProviderAvailability.modelId, modelProviderAvailability.provider],
            set: {
              providerModelId: matchedApiId,
              lastVerifiedAt: now,
            },
          });
        upserted++;
      }
      else {
        await db
          .delete(modelProviderAvailability)
          .where(
            and(
              eq(modelProviderAvailability.modelId, modelId),
              eq(modelProviderAvailability.provider, "anthropic"),
            ),
          );
        removed++;
      }
    }

    return {
      success: true,
      upserted,
      removed,
      durationMs: Date.now() - startTime,
    };
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to sync Anthropic provider availability:", error);

    return {
      success: false,
      upserted: 0,
      removed: 0,
      durationMs: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Get the last successful sync time
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const [status] = await db
    .select({ lastSyncedAt: modelsSyncStatus.lastSyncedAt })
    .from(modelsSyncStatus)
    .orderBy(desc(modelsSyncStatus.lastSyncedAt))
    .limit(1);

  return status?.lastSyncedAt ?? null;
}
