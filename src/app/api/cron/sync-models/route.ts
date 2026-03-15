/* eslint-disable node/no-process-env */
import { NextResponse } from "next/server";

import { syncAnthropicProviderAvailability, syncDirectProviderAvailability, syncModelsFromOpenRouter } from "~/features/models/server/sync-models";
import { serverEnv } from "~/lib/env";

// Cron endpoint to sync models from OpenRouter
// Runs every 6 hours via vercel.json crons configuration
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access (skip in development)
  const isDev = process.env.NODE_ENV === "development";
  const authHeader = request.headers.get("authorization");
  const cronSecret = serverEnv.CRON_SECRET;

  if (!isDev && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
