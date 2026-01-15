import type { Model } from "@openrouter/sdk/models";

import type { ModelCapabilities } from "../types";

import { getModelCapabilities } from "./model-capabilities";

export type ModelMetadata = {
  provider: string;
  name: string;
};

export function buildModelMetadataMap(
  models: Model[],
): Map<string, ModelMetadata> {
  const map = new Map<string, ModelMetadata>();

  for (const model of models) {
    const [provider, ...nameParts] = model.id.split("/");
    map.set(model.id, {
      provider: provider ?? "",
      name: nameParts.join("/"),
    });
  }

  return map;
}

export function buildCapabilitiesMap(
  models: Model[],
): Map<string, ModelCapabilities> {
  const map = new Map<string, ModelCapabilities>();

  for (const model of models) {
    map.set(model.id, getModelCapabilities(model));
  }

  return map;
}
