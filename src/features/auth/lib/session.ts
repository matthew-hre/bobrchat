import { headers } from "next/headers";

import type { Session } from "./auth";

import { auth } from "./auth";

/**
 * Get the current session, or null if not authenticated.
 */
export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Get the current session, throwing if not authenticated.
 */
export async function getRequiredSession(): Promise<Session> {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  return session;
}
