"use server";

import type { Model } from "@openrouter/sdk/models";
import type { SQL } from "drizzle-orm";

import { and, arrayContains, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "~/lib/db";
import { models } from "~/lib/db/schema";

import type { ModelsQueryParams, ModelsQueryResult } from "../types";

/**
 * Query models from database with filtering, sorting, and pagination
 */
export async function queryModels(params: ModelsQueryParams = {}): Promise<ModelsQueryResult> {
  const {
    search,
    capabilities = [],
    providers = [],
    sortOrder = "provider-asc",
    page = 1,
    pageSize = 50,
  } = params;

  const conditions: SQL[] = [];

  // Search filter (name, provider, description)
  if (search?.trim()) {
    const searchTerm = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(models.name, searchTerm),
        ilike(models.provider, searchTerm),
        ilike(models.description, searchTerm),
        ilike(models.modelId, searchTerm),
      )!,
    );
  }

  // Provider filter
  if (providers.length > 0) {
    conditions.push(
      or(...providers.map(p => eq(models.provider, p)))!,
    );
  }

  // Capability filters
  for (const cap of capabilities) {
    switch (cap) {
      case "image":
        conditions.push(arrayContains(models.inputModalities, ["image"]));
        break;
      case "pdf":
        // PDF support: either native file support or sufficient context length
        conditions.push(
          or(
            arrayContains(models.inputModalities, ["file"]),
            sql`${models.contextLength} > 16000`,
          )!,
        );
        break;
      case "search":
        // Search: tools support + large context
        conditions.push(arrayContains(models.supportedParameters, ["tools"]));
        conditions.push(sql`${models.contextLength} > 32000`);
        break;
      case "reasoning":
        conditions.push(arrayContains(models.supportedParameters, ["reasoning"]));
        break;
    }
  }

  // Build order clause
  const orderClause = (() => {
    switch (sortOrder) {
      case "provider-asc":
        return models.provider;
      case "provider-desc":
        return desc(models.provider);
      case "model-asc":
        return models.name;
      case "model-desc":
        return desc(models.name);
      case "cost-asc":
        return models.pricingPrompt;
      case "cost-desc":
        return desc(models.pricingPrompt);
      default:
        return models.provider;
    }
  })();

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(models)
    .where(whereClause);

  const total = countResult?.count ?? 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const rows = await db
    .select({ rawData: models.rawData })
    .from(models)
    .where(whereClause)
    .orderBy(orderClause)
    .limit(pageSize)
    .offset(offset);

  return {
    models: rows.map(r => r.rawData as Model),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get all unique providers from the database
 */
export async function getProviders(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ provider: models.provider })
    .from(models)
    .orderBy(models.provider);

  return rows.map(r => r.provider);
}

/**
 * Get models by IDs (for favorites lookup)
 */
export async function getModelsByIds(ids: string[]): Promise<Model[]> {
  if (ids.length === 0)
    return [];

  const rows = await db
    .select({ rawData: models.rawData, modelId: models.modelId })
    .from(models)
    .where(or(...ids.map(id => eq(models.modelId, id))));

  // Preserve order from input ids
  const modelMap = new Map(rows.map(r => [r.modelId, r.rawData as Model]));
  return ids
    .map(id => modelMap.get(id))
    .filter((m): m is Model => m !== undefined);
}

/**
 * Get a single model by ID
 */
export async function getModelById(modelId: string): Promise<Model | null> {
  const [row] = await db
    .select({ rawData: models.rawData })
    .from(models)
    .where(eq(models.modelId, modelId))
    .limit(1);

  return (row?.rawData as Model) ?? null;
}

/**
 * Get total model count
 */
export async function getModelCount(): Promise<number> {
  const [result] = await db.select({ count: count() }).from(models);
  return result?.count ?? 0;
}
