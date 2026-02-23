import type { UserSettingsData } from "~/features/settings/types";

import { getSession } from "~/features/auth/lib/session";
import { getUserSettings } from "~/features/settings/queries";

/**
 * GET /api/settings
 * Fetch authenticated user's settings (excludes encrypted API keys)
 */
export async function GET(): Promise<Response> {
  try {
    const session = await getSession();

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getUserSettings(session.user.id);

    return Response.json(settings as UserSettingsData);
  }
  catch (error) {
    console.error("Failed to fetch settings:", error);
    return Response.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}
