"use server";

import type { Model } from "@openrouter/sdk/models";

import { headers } from "next/headers";

import { auth } from "~/features/auth/lib/auth";

import type { ModelsListQueryResult, ModelsQueryParams, ModelsQueryResult } from "./types";

import { getModelById, getModelsByIds, getModelsByIdsForList, getProviders, queryModels, queryModelsForList } from "./server/queries";

/**
 * Fetch models from database with filtering, sorting, and pagination
 * Requires authentication
 */
export async function fetchModels(params: ModelsQueryParams = {}): Promise<ModelsQueryResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return queryModels(params);
}

/**
 * Get models by their IDs (for favorites)
 */
export async function fetchModelsByIds(ids: string[]): Promise<Model[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return getModelsByIds(ids);
}

/**
 * Get a single model by ID
 */
export async function fetchModelById(modelId: string): Promise<Model | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return getModelById(modelId);
}

/**
 * Get all unique providers
 */
export async function fetchProviders(): Promise<string[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return getProviders();
}

/**
 * Fetch models for list view - returns only fields needed for display
 * Requires authentication
 */
export async function fetchModelsForList(params: ModelsQueryParams = {}): Promise<ModelsListQueryResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return queryModelsForList(params);
}

/**
 * Get models by their IDs for list view (lightweight)
 */
export async function fetchModelsByIdsForList(ids: string[]): Promise<import("./types").ModelListItem[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return getModelsByIdsForList(ids);
}
