"use server";

import type { Model } from "@openrouter/sdk/models";

import { OpenRouter } from "@openrouter/sdk";
import { eq } from "drizzle-orm";

import { db } from "~/lib/db";
import { models, modelsSyncStatus } from "~/lib/db/schema";
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
 * Get the last successful sync time
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const [status] = await db
    .select({ lastSyncedAt: modelsSyncStatus.lastSyncedAt })
    .from(modelsSyncStatus)
    .orderBy(modelsSyncStatus.lastSyncedAt)
    .limit(1);

  return status?.lastSyncedAt ?? null;
}
