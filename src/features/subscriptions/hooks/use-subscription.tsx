"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { SubscriptionStatus } from "~/features/subscriptions/actions";

import { getSubscriptionStatus } from "~/features/subscriptions/actions";

export const SUBSCRIPTION_KEY = ["subscription"] as const;

const POLL_TIMEOUT_MS = 30_000;

export function useSubscription() {
  const searchParams = useSearchParams();
  const hasCheckoutToken = searchParams.has("customer_session_token");
  const [awaitingUpgrade, setAwaitingUpgrade] = useState(hasCheckoutToken);

  useEffect(() => {
    if (!hasCheckoutToken)
      return;
    const timer = setTimeout(() => setAwaitingUpgrade(false), POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hasCheckoutToken]);

  const query = useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: () => getSubscriptionStatus(),
    staleTime: awaitingUpgrade ? 0 : 60 * 1000,
    refetchInterval: awaitingUpgrade
      ? q => (q.state.data?.tier === "free" ? 2000 : false)
      : false,
  });

  return { ...query, awaitingUpgrade: awaitingUpgrade && query.data?.tier === "free" };
}

export type { SubscriptionStatus };
