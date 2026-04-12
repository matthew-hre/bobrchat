"use client";

import { CheckIcon, SparklesIcon } from "lucide-react";
import { Suspense } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { useSubscription } from "~/features/subscriptions/hooks/use-subscription";
import { cn } from "~/lib/utils";

import { SettingsSection } from "../ui/settings-section";
import { SubscriptionCard } from "../ui/subscription-card";

const PLAN_INFO: Record<string, { label: string; description: string; features: string[] }> = {
  free: {
    label: "Free",
    description: "Get started with the basics.",
    features: [
      "100 threads",
      "10 MB storage",
    ],
  },
  beta: {
    label: "Beta (Lifetime)",
    description: "Early supporter access — thank you for testing!",
    features: [
      "Unlimited threads",
      "100 MB storage",
    ],
  },
  plus: {
    label: "Plus",
    description: "The full BobrChat experience.",
    features: [
      "Unlimited threads",
      "100 MB storage",
      "Free thread titling",
      "Incognito chats",
      "Priority support",
    ],
  },
};

function PlanDetails() {
  const { data: subscription } = useSubscription();

  if (!subscription) {
    return null;
  }

  const plan = PLAN_INFO[subscription.tier] ?? PLAN_INFO.free;

  return (
    <div className="bg-card space-y-3 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{plan.label}</h3>
        {subscription.tier === "plus" && (
          <SparklesIcon className="text-primary size-3.5" />
        )}
      </div>
      <p className="text-muted-foreground text-xs">{plan.description}</p>
      <ul className="space-y-1.5">
        {plan.features.map(feature => (
          <li key={feature} className={cn("flex items-center gap-2 text-xs")}>
            <CheckIcon className="text-primary size-3 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
          title="Billing & Usage"
          description="Manage your subscription and track usage."
        >
          <Suspense fallback={<SubscriptionCardFallback />}>
            <SubscriptionCard />
          </Suspense>
          <Suspense fallback={<SubscriptionCardFallback />}>
            <PlanDetails />
          </Suspense>
        </SettingsSection>
      </div>
    </div>
  );
}
