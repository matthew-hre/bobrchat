"use client";

import { SettingsSection } from "../ui/settings-section";
import { SubscriptionCard } from "../ui/subscription-card";

export function SubscriptionPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <SettingsSection
          title="Subscription"
          description="View your current plan and usage."
        >
          <SubscriptionCard />
        </SettingsSection>
      </div>
    </div>
  );
}
