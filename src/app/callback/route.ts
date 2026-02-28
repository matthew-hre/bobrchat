import { handleAuth } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";

import { createDefaultUserSettings } from "~/features/settings/actions";
import { createUserSubscription } from "~/features/subscriptions/queries";
import { db } from "~/lib/db";
import { users } from "~/lib/db/schema";

export const GET = handleAuth({
  returnPathname: "/",
  onSuccess: async ({ user }) => {
    // Check if already linked by workosId
    const [byWorkosId] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.workosId, user.id))
      .limit(1);

    if (byWorkosId) {
      await db
        .update(users)
        .set({
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
          image: user.profilePictureUrl ?? null,
        })
        .where(eq(users.id, byWorkosId.id));
      return;
    }

    // Check if a pre-existing user has the same email
    const [byEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1);

    if (byEmail) {
      // Link existing user to their WorkOS identity
      await db
        .update(users)
        .set({
          workosId: user.id,
          image: user.profilePictureUrl ?? null,
        })
        .where(eq(users.id, byEmail.id));
      return;
    }

    // Brand new user
    const [newUser] = await db
      .insert(users)
      .values({
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
        email: user.email,
        image: user.profilePictureUrl ?? null,
        workosId: user.id,
      })
      .returning();

    if (newUser) {
      await Promise.all([
        createDefaultUserSettings(newUser.id),
        createUserSubscription(newUser.id),
      ]);
    }
  },
});
