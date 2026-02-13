import { eq } from "drizzle-orm";

import type { SubscriptionTier } from "~/lib/db/schema/subscriptions";

import { db } from "~/lib/db";
import { subscriptions, TIER_LIMITS } from "~/lib/db/schema/subscriptions";
import { serverEnv } from "~/lib/env";

export const POLAR_PRODUCT_IDS = {
  plus: serverEnv.POLAR_PLUS_PRODUCT_ID ?? "",
} as const;

export async function createUserSubscription(userId: string, tier: SubscriptionTier = "free") {
  await db.insert(subscriptions).values({ userId, tier }).onConflictDoNothing();
}

export async function getUserSubscription(userId: string) {
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!result[0]) {
    await createUserSubscription(userId);
    return {
      tier: "free" as SubscriptionTier,
      isLifetimeBeta: false,
      limits: TIER_LIMITS.free,
    };
  }

  return {
    tier: result[0].tier,
    isLifetimeBeta: result[0].isLifetimeBeta,
    limits: TIER_LIMITS[result[0].tier],
    polarCustomerId: result[0].polarCustomerId,
    polarSubscriptionId: result[0].polarSubscriptionId,
  };
}

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const sub = await getUserSubscription(userId);
  return sub.tier;
}

export async function setUserTier(userId: string, tier: SubscriptionTier) {
  await db
    .update(subscriptions)
    .set({ tier, updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId));
}

function productIdToTier(productId: string): SubscriptionTier | null {
  if (productId === POLAR_PRODUCT_IDS.plus)
    return "plus";
  return null;
}

export async function syncSubscriptionFromPolarState(params: {
  userId?: string;
  polarCustomerId: string;
  activeSubscriptions: Array<{ id: string; productId: string }>;
  isDeleted?: boolean;
}) {
  const { userId, polarCustomerId, activeSubscriptions, isDeleted } = params;

  // Handle customer deletion - look up by polarCustomerId
  if (isDeleted || !userId) {
    const existing = await db
      .select({ isLifetimeBeta: subscriptions.isLifetimeBeta })
      .from(subscriptions)
      .where(eq(subscriptions.polarCustomerId, polarCustomerId))
      .limit(1);

    await db
      .update(subscriptions)
      .set({
        tier: existing[0]?.isLifetimeBeta ? "beta" : "free",
        polarCustomerId: null,
        polarSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.polarCustomerId, polarCustomerId));
    return;
  }

  const existing = await db
    .select({ isLifetimeBeta: subscriptions.isLifetimeBeta })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const isLifetimeBeta = existing[0]?.isLifetimeBeta ?? false;

  if (activeSubscriptions.length > 0) {
    const sub = activeSubscriptions[0];
    const tier = productIdToTier(sub.productId);

    if (!tier) {
      console.error("Unrecognized Polar product ID during sync.", {
        userId,
        polarCustomerId,
        productId: sub.productId,
        subscriptionId: sub.id,
      });
      return;
    }

    await db
      .update(subscriptions)
      .set({
        tier,
        polarCustomerId,
        polarSubscriptionId: sub.id,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  }
  else {
    await db
      .update(subscriptions)
      .set({
        tier: isLifetimeBeta ? "beta" : "free",
        polarCustomerId,
        polarSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  }
}
