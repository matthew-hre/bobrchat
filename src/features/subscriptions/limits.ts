import { count, eq } from "drizzle-orm";

import type { SubscriptionTier } from "~/lib/db/schema/subscriptions";

import { getUserStorageUsage } from "~/features/attachments/queries";
import { db } from "~/lib/db";
import { threads } from "~/lib/db/schema/chat";
import { TIER_LIMITS } from "~/lib/db/schema/subscriptions";

import { getUserSubscription } from "./queries";

export type LimitCheckResult
  = | { allowed: true; currentUsage: number }
    | { allowed: false; reason: string; currentUsage: number; limit: number };

export async function checkThreadLimit(userId: string): Promise<LimitCheckResult> {
  const subscription = await getUserSubscription(userId);
  const threadLimit = subscription.limits.threads;

  const result = await db
    .select({ count: count() })
    .from(threads)
    .where(eq(threads.userId, userId));

  const currentCount = result[0]?.count ?? 0;

  if (threadLimit === null) {
    return { allowed: true, currentUsage: currentCount };
  }

  if (currentCount >= threadLimit) {
    return {
      allowed: false,
      reason: `You've reached your limit of ${threadLimit} threads. Delete some threads or upgrade to continue.`,
      currentUsage: currentCount,
      limit: threadLimit,
    };
  }

  return { allowed: true, currentUsage: currentCount };
}

export async function getStorageQuota(userId: string): Promise<{ quota: number; usedBytes: number; tier: SubscriptionTier }> {
  const [subscription, usedBytes] = await Promise.all([
    getUserSubscription(userId),
    getUserStorageUsage(userId),
  ]);
  return {
    quota: subscription.limits.storageBytes,
    usedBytes,
    tier: subscription.tier,
  };
}

export function getTierStorageQuota(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier].storageBytes;
}

export function getTierThreadLimit(tier: SubscriptionTier): number | null {
  return TIER_LIMITS[tier].threads;
}
