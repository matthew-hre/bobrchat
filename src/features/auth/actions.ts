"use server";

import { signOut, withAuth } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";

import { getRequiredSession } from "~/features/auth/lib/session";
import { db } from "~/lib/db";
import { users } from "~/lib/db/schema";
import { serverEnv } from "~/lib/env";

export async function handleSignOut() {
  await signOut();
}

export async function deleteAccount() {
  const session = await getRequiredSession();
  const { user: workosUser } = await withAuth();

  await db.delete(users).where(eq(users.id, session.user.id));

  if (workosUser) {
    await fetch(
      `https://api.workos.com/user_management/users/${workosUser.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${serverEnv.WORKOS_API_KEY}` },
      },
    );
  }

  await signOut();
}
