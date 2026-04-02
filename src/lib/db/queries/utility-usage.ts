import { eq } from "drizzle-orm";

import { db } from "~/lib/db";
import { modelProviderAvailability, models } from "~/lib/db/schema/models";
import { utilityUsage } from "~/lib/db/schema/usage";

export type UtilityUsageType = "title" | "icon" | "metadata" | "tags" | "handoff";

async function findModelPricing(model: string) {
  let [pricing] = await db
    .select({
      pricingPrompt: models.pricingPrompt,
      pricingCompletion: models.pricingCompletion,
    })
    .from(models)
    .where(eq(models.modelId, model))
    .limit(1);

  if (pricing?.pricingPrompt != null && pricing?.pricingCompletion != null) {
    return pricing;
  }

  const [availability] = await db
    .select({ modelId: modelProviderAvailability.modelId })
    .from(modelProviderAvailability)
    .where(eq(modelProviderAvailability.providerModelId, model))
    .limit(1);

  if (availability) {
    [pricing] = await db
      .select({
        pricingPrompt: models.pricingPrompt,
        pricingCompletion: models.pricingCompletion,
      })
      .from(models)
      .where(eq(models.modelId, availability.modelId))
      .limit(1);

    if (pricing?.pricingPrompt != null && pricing?.pricingCompletion != null) {
      return pricing;
    }
  }

  return null;
}

export async function logUtilityUsage(
  userId: string,
  type: UtilityUsageType,
  model: string,
  usage: { inputTokens?: number; outputTokens?: number },
): Promise<void> {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;

  let costTotalUsd = "0";

  const pricing = await findModelPricing(model);

  if (pricing && pricing.pricingPrompt != null && pricing.pricingCompletion != null) {
    const promptCost = inputTokens * pricing.pricingPrompt;
    const completionCost = outputTokens * pricing.pricingCompletion;
    costTotalUsd = (promptCost + completionCost).toString();
  }

  await db.insert(utilityUsage).values({
    userId,
    type,
    model,
    inputTokens,
    outputTokens,
    costTotalUsd,
  });
}
