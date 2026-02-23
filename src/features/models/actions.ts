"use server";

import type { Model } from "@openrouter/sdk/models";

import { getRequiredSession } from "~/features/auth/lib/session";

import type { ModelsListQueryResult, ModelsQueryParams, ModelsQueryResult } from "./types";

import { getModelById, getModelsByIds, getModelsByIdsForList, getProviders, queryModels, queryModelsForList } from "./server/queries";

/**
 * Fetch models from database with filtering, sorting, and pagination
 * Requires authentication
 */
export async function fetchModels(params: ModelsQueryParams = {}): Promise<ModelsQueryResult> {
  await getRequiredSession();

  return queryModels(params);
}

/**
 * Get models by their IDs (for favorites)
 */
export async function fetchModelsByIds(ids: string[]): Promise<Model[]> {
  await getRequiredSession();

  return getModelsByIds(ids);
}

/**
 * Get a single model by ID
 */
export async function fetchModelById(modelId: string): Promise<Model | null> {
  await getRequiredSession();

  return getModelById(modelId);
}

/**
 * Get all unique providers
 */
export async function fetchProviders(): Promise<string[]> {
  await getRequiredSession();

  return getProviders();
}

/**
 * Fetch models for list view - returns only fields needed for display
 * Requires authentication
 */
export async function fetchModelsForList(params: ModelsQueryParams = {}): Promise<ModelsListQueryResult> {
  await getRequiredSession();

  return queryModelsForList(params);
}

/**
 * Get models by their IDs for list view (lightweight)
 */
export async function fetchModelsByIdsForList(ids: string[]): Promise<import("./types").ModelListItem[]> {
  await getRequiredSession();

  return getModelsByIdsForList(ids);
}
