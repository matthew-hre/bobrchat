"use server";

import type { SubscriptionTier } from "~/lib/db/schema/subscriptions";

import { getRequiredSession } from "~/features/auth/lib/session";
import { serverEnv } from "~/lib/env";
import { polarClient } from "~/lib/polar";

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
  const session = await getRequiredSession();

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

export async function createCheckoutSession(productId: string): Promise<{ url: string } | { error: string }> {
  if (!polarClient) {
    return { error: "Payments are not configured." };
  }

  const session = await getRequiredSession();

  const checkout = await polarClient.checkouts.create({
    products: [productId],
    customerEmail: session.user.email,
    externalCustomerId: session.user.id,
    successUrl: serverEnv.POLAR_SUCCESS_URL ?? `${serverEnv.BETTER_AUTH_URL}/settings?tab=subscription`,
  });

  return { url: checkout.url };
}

export async function createCustomerPortalSession(): Promise<{ url: string } | { error: string }> {
  if (!polarClient) {
    return { error: "Payments are not configured." };
  }

  const session = await getRequiredSession();
  const subscription = await getUserSubscription(session.user.id);

  if (!subscription.polarCustomerId) {
    return { error: "No billing account found." };
  }

  const portalSession = await polarClient.customerSessions.create({
    customerId: subscription.polarCustomerId,
  });

  return { url: portalSession.customerPortalUrl };
}
