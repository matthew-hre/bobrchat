"use client";

import { useState } from "react";

import type { UsageData } from "~/features/usage/actions";
import type { UsagePeriod } from "~/features/usage/hooks/use-usage";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { useUsageData } from "~/features/usage/hooks/use-usage";

export function formatCost(cost: number): string {
  if (cost === 0)
    return "$0.000000";
  return `$${cost.toFixed(6)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000)
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000)
    return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toLocaleString();
}

export const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        {["spend", "messages", "input", "output"].map(key => (
          <div key={key} className="bg-card rounded-lg border p-4">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function useUsagePage() {
  const [period, setPeriod] = useState<UsagePeriod>("7d");
  const { data, isLoading } = useUsageData(period);
  return { period, setPeriod, data, isLoading };
}

export function PeriodSelector({ period, setPeriod }: { period: UsagePeriod; setPeriod: (v: UsagePeriod) => void }) {
  return (
    <Select value={period} onValueChange={v => setPeriod(v as UsagePeriod)}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="90d">Last 90 days</SelectItem>
        <SelectItem value="all">All time</SelectItem>
      </SelectContent>
    </Select>
  );
}

export type UsagePageLayoutProps = {
  children: React.ReactNode;
  period: UsagePeriod;
  setPeriod: (v: UsagePeriod) => void;
  data: UsageData | undefined;
  isLoading: boolean;
};

export function UsagePageLayout({ children, period, setPeriod, data, isLoading }: UsagePageLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <PeriodSelector period={period} setPeriod={setPeriod} />
        {isLoading || !data
          ? <LoadingSkeleton />
          : children}
        <p className="text-muted-foreground pt-4 pb-6 text-center text-xs">
          Costs are estimated from listed model pricing and may not reflect actual charges.
          Verify your spending in your provider&apos;s dashboard.
        </p>
      </div>
    </div>
  );
}
