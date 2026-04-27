import { NextResponse } from "next/server";

import { syncAnthropicProviderAvailability, syncDirectProviderAvailability, syncModelsFromOpenRouter } from "~/features/models/server/sync-models";
import { cronRateLimit, rateLimitResponse } from "~/lib/rate-limit";

export async function GET() {
  const { success, reset } = await cronRateLimit.limit("sync-models");
  if (!success) {
    return rateLimitResponse(reset);
  }

  const result = await syncModelsFromOpenRouter();

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, durationMs: result.durationMs },
      { status: 500 },
    );
  }

  const providerResult = await syncDirectProviderAvailability();
  const anthropicResult = await syncAnthropicProviderAvailability();

  return NextResponse.json({
    success: true,
    modelCount: result.modelCount,
    durationMs: result.durationMs,
    directProviderSync: {
      success: providerResult.success,
      upserted: providerResult.upserted,
      removed: providerResult.removed,
      durationMs: providerResult.durationMs,
      ...(providerResult.skipped && { skipped: true }),
      ...(providerResult.error && { error: providerResult.error }),
    },
    anthropicProviderSync: {
      success: anthropicResult.success,
      upserted: anthropicResult.upserted,
      removed: anthropicResult.removed,
      durationMs: anthropicResult.durationMs,
      ...(anthropicResult.skipped && { skipped: true }),
      ...(anthropicResult.error && { error: anthropicResult.error }),
    },
  });
}
