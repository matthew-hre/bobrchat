"use client";

import { Suspense } from "react";

import { Skeleton } from "~/components/ui/skeleton";

import { SettingsSection } from "../ui/settings-section";
import { SubscriptionCard } from "../ui/subscription-card";

function SubscriptionCardFallback() {
  return (
    <div className="bg-card space-y-3 rounded-lg p-4">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function SubscriptionPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <SettingsSection
          title="Subscription"
          description="View your current plan and usage."
        >
          <Suspense fallback={<SubscriptionCardFallback />}>
            <SubscriptionCard />
          </Suspense>
        </SettingsSection>
      </div>
    </div>
  );
}
