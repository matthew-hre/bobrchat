"use server";

import { signOut } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";

import { getRequiredSession } from "~/features/auth/lib/session";
import { db } from "~/lib/db";
import { users } from "~/lib/db/schema";

export async function handleSignOut() {
  await signOut();
}

export async function deleteAccount() {
  const session = await getRequiredSession();

  await db.delete(users).where(eq(users.id, session.user.id));
  await signOut();
}
