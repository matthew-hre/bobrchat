import { withAuth } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "~/lib/db";
import { users } from "~/lib/db/schema";

import type { Session } from "./auth";

const resolveInternalUser = cache(async (workosId: string, workosName: string) => {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.workosId, workosId))
    .limit(1);
  if (!row)
    return null;

  if (row.name !== workosName) {
    await db.update(users).set({ name: workosName }).where(eq(users.id, row.id));
    return { ...row, name: workosName };
  }

  return row;
});

/**
 * Get the current session, or null if not authenticated.
 */
export async function getSession(): Promise<Session | null> {
  const { user: workosUser } = await withAuth();

  if (!workosUser) {
    return null;
  }

  const workosName = `${workosUser.firstName ?? ""} ${workosUser.lastName ?? ""}`.trim() || workosUser.email;
  const internalUser = await resolveInternalUser(workosUser.id, workosName);

  if (!internalUser) {
    return null;
  }

  return {
    user: {
      id: internalUser.id,
      name: internalUser.name,
      email: internalUser.email,
      image: internalUser.image,
      createdAt: internalUser.createdAt,
      updatedAt: internalUser.updatedAt,
    },
  };
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
