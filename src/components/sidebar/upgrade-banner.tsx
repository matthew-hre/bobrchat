"use client";

import { SparklesIcon } from "lucide-react";
import { useState } from "react";

import { UpgradeDialog } from "~/features/subscriptions/components/upgrade-dialog";
import { useSubscription } from "~/features/subscriptions/hooks/use-subscription";
import { cn } from "~/lib/utils";

export function UpgradeBanner() {
  const { data: subscription, isLoading } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (isLoading || !subscription) {
    return null;
  }

  if (subscription.tier !== "free") {
    return null;
  }

  const { current, limit } = subscription.usage.threads;
  const hasLimit = limit !== null;
  const percentage = hasLimit ? Math.min((current / limit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <>
      <div className="border-sidebar-border border-t px-3 py-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {hasLimit ? `${current} / ${limit} threads` : `${current} threads`}
            </span>
            <button
              onClick={() => setShowUpgrade(true)}
              className={cn(
                "text-primary flex items-center gap-1 text-xs font-medium",
                "hover:underline",
              )}
            >
              <SparklesIcon className="size-3" />
              Upgrade
            </button>
          </div>
          {hasLimit && (
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
          )}
        </div>
      </div>
      <UpgradeDialog open={showUpgrade} onOpenChangeAction={setShowUpgrade} />
    </>
  );
}
