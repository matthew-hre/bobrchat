"use server";

import { headers } from "next/headers";

import type { SubscriptionTier } from "~/lib/db/schema/subscriptions";

import { auth } from "~/features/auth/lib/auth";

import { checkThreadLimit, getStorageQuota, getUserSubscription, POLAR_PRODUCT_IDS } from "./index";

export type SubscriptionStatus = {
  tier: SubscriptionTier;
  limits: {
    threads: number | null;
    storageBytes: number;
  };
  usage: {
    threads: { current: number; limit: number | null };
    storage: { current: number; limit: number };
  };
  polarCustomerId: string | null;
  canUpgrade: boolean;
};

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const [subscription, threadCheck, storageInfo] = await Promise.all([
    getUserSubscription(session.user.id),
    checkThreadLimit(session.user.id),
    getStorageQuota(session.user.id),
  ]);

  return {
    tier: subscription.tier,
    limits: subscription.limits,
    usage: {
      threads: {
        current: threadCheck.currentUsage,
        limit: subscription.limits.threads,
      },
      storage: { current: storageInfo.usedBytes, limit: storageInfo.quota },
    },
    polarCustomerId: subscription.polarCustomerId ?? null,
    canUpgrade: subscription.tier === "free",
  };
}

export async function getPolarProductId(tier: "plus"): Promise<string | undefined> {
  return POLAR_PRODUCT_IDS[tier];
}
