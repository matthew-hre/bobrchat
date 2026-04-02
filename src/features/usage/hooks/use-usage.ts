"use client";

import { useQuery } from "@tanstack/react-query";

import type { UsageData } from "~/features/usage/actions";

import { getUsageData } from "~/features/usage/actions";

export type UsagePeriod = "7d" | "30d" | "90d" | "all";

export const USAGE_KEY = ["usage"] as const;

export function useUsageData(period: UsagePeriod) {
  return useQuery<UsageData>({
    queryKey: [...USAGE_KEY, period],
    queryFn: () => getUsageData(period),
    staleTime: 30 * 1000,
  });
}
