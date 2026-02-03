"use server";

import type { Model } from "@openrouter/sdk/models";

import { headers } from "next/headers";

import { auth } from "~/features/auth/lib/auth";

import type { ModelsQueryParams, ModelsQueryResult } from "./types";

import { getModelById, getModelsByIds, getProviders, queryModels } from "./server/queries";

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
