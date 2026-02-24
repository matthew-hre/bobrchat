"use client";

import { ExternalLinkIcon, LoaderIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { createCustomerPortalSession } from "~/features/subscriptions/actions";
import { UpgradeDialog } from "~/features/subscriptions/components/upgrade-dialog";
import { UsageMeter } from "~/features/subscriptions/components/usage-meter";
import { useSubscription } from "~/features/subscriptions/hooks/use-subscription";
import { cn } from "~/lib/utils";

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "FREE", color: "text-muted-foreground" },
  beta: { label: "BETA (lifetime)", color: "text-primary font-mono" },
  plus: { label: "PLUS", color: "text-primary" },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export function SubscriptionCard() {
  const { data: subscription, isLoading, awaitingUpgrade } = useSubscription();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleManageSubscription = async () => {
    setIsRedirecting(true);
    try {
      const result = await createCustomerPortalSession();
      if ("error" in result) {
        setIsRedirecting(false);
        return;
      }
      window.location.href = result.url;
    }
    catch {
      setIsRedirecting(false);
    }
  };

  if (isLoading || awaitingUpgrade) {
    return (
      <div className="bg-card space-y-3 rounded-lg p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const tierConfig = TIER_LABELS[subscription.tier] || TIER_LABELS.free;

  return (
    <>
      <div className="bg-card space-y-4 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Subscription
          </h3>
          <div
            className={cn(
              "flex items-center text-xs font-medium",
              tierConfig.color,
            )}
          >
            {tierConfig.label}
          </div>
        </div>

        <div className="space-y-3">
          <UsageMeter
            label="Threads"
            current={subscription.usage.threads.current}
            limit={subscription.usage.threads.limit}
          />
          <UsageMeter
            label="Storage"
            current={subscription.usage.storage.current}
            limit={subscription.usage.storage.limit}
            formatValue={formatBytes}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {subscription.canUpgrade && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => setShowUpgrade(true)}
            >
              <SparklesIcon className="size-3" />
              Upgrade
            </Button>
          )}
          {subscription.polarCustomerId && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleManageSubscription}
              disabled={isRedirecting}
            >
              {isRedirecting
                ? (
                    <>
                      <LoaderIcon className="size-3 animate-spin" />
                      Redirecting...
                    </>
                  )
                : (
                    <>
                      <ExternalLinkIcon className="size-3" />
                      Manage
                    </>
                  )}
            </Button>
          )}
        </div>
      </div>
      <UpgradeDialog open={showUpgrade} onOpenChangeAction={setShowUpgrade} />
    </>
  );
}
