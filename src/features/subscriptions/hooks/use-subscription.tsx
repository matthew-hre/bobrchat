"use client";

import { useQuery } from "@tanstack/react-query";

import type { SubscriptionStatus } from "~/features/subscriptions/actions";

import { getSubscriptionStatus } from "~/features/subscriptions/actions";

export const SUBSCRIPTION_KEY = ["subscription"] as const;

export function useSubscription() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: () => getSubscriptionStatus(),
    staleTime: 60 * 1000,
  });
}

export type { SubscriptionStatus };
