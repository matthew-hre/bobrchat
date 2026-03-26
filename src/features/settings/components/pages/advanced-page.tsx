"use client";

import { Skeleton } from "~/components/ui/skeleton";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { AdvancedFeaturesSection } from "../sections/advanced-features-section";

export function AdvancedPage() {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });

  if (isLoading || !settings) {
    return <AdvancedPageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <AdvancedFeaturesSection settings={settings} />
      </div>
    </div>
  );
}

function AdvancedPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}
