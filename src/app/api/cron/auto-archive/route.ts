import { and, eq, isNull, lt } from "drizzle-orm";
import { NextResponse } from "next/server";

import type { UserSettingsData } from "~/features/settings/types";

import { db } from "~/lib/db";
import { threads } from "~/lib/db/schema/chat";
import { userSettings } from "~/lib/db/schema/settings";
import { cronRateLimit, rateLimitResponse } from "~/lib/rate-limit";

export async function GET() {
  const { success, reset } = await cronRateLimit.limit("auto-archive");
  if (!success) {
    return rateLimitResponse(reset);
  }

  const rows = await db
    .select({
      userId: userSettings.userId,
      settings: userSettings.settings,
    })
    .from(userSettings);

  let totalArchived = 0;

  for (const row of rows) {
    const settings = row.settings as UserSettingsData;
    const days = settings.autoArchiveAfterDays;

    if (!days)
      continue;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await db
      .update(threads)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(threads.userId, row.userId),
          isNull(threads.archivedAt),
          lt(threads.lastMessageAt, cutoff),
        ),
      )
      .returning({ id: threads.id });

    totalArchived += result.length;
  }

  return NextResponse.json({ success: true, archivedCount: totalArchived });
}
