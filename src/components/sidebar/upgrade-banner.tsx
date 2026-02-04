"use client";

import { SparklesIcon } from "lucide-react";
import Link from "next/link";

import { useSubscription } from "~/features/subscriptions/hooks/use-subscription";
import { cn } from "~/lib/utils";

export function UpgradeBanner() {
  const { data: subscription, isLoading } = useSubscription();

  if (isLoading || !subscription) {
    return null;
  }

  // Only show for free tier users
  if (subscription.tier !== "free") {
    return null;
  }

  const { current, limit } = subscription.usage.threads;
  const percentage = limit ? Math.min((current / limit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="border-sidebar-border border-t px-3 py-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            {current}
            {" "}
            /
            {limit}
            {" "}
            threads
          </span>
          <Link
            href="/pricing"
            className={cn(
              "text-primary flex items-center gap-1 text-xs font-medium",
              "hover:underline",
            )}
          >
            <SparklesIcon className="size-3" />
            Upgrade
          </Link>
        </div>
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full transition-all",
              isAtLimit
                ? "bg-destructive"
                : isNearLimit
                  ? "bg-warning"
                  : `bg-primary`,
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
