"use server";

import type { Model, ModelsListResponse } from "@openrouter/sdk/models";

import { OpenRouter } from "@openrouter/sdk";
import { headers } from "next/headers";

import { auth } from "~/features/auth/lib/auth";
import { resolveKey } from "~/lib/api-keys/server";

/**
 * Fetch all available models from OpenRouter catalogue
 * Requires authentication and a valid OpenRouter API key
 *
 * @param clientKey Optional client-provided API key (uses server-stored key if not provided)
 * @return {Promise<Model[]>} Array of available models with metadata
 * @throws {Error} If not authenticated or no API key available
 */
export async function fetchOpenRouterModels(clientKey?: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const openrouterKey = await resolveKey(session.user.id, "openrouter", clientKey);

  if (!openrouterKey) {
    throw new Error("No OpenRouter API key configured");
  }

  try {
    const openRouter = new OpenRouter({
      apiKey: openrouterKey,
    });

    const result: ModelsListResponse = await openRouter.models.list({});

    if (!result || !Array.isArray(result.data)) {
      throw new Error("Invalid response from OpenRouter API");
    }

    let models = result.data;

    models = models.filter((model: Model) => {
      return !(model.architecture?.outputModalities?.includes("image"));
    });

    return models;
  }
  catch (error) {
    console.error("Failed to fetch models from OpenRouter:", error);
    throw new Error("Failed to fetch models from OpenRouter API");
  }
}
