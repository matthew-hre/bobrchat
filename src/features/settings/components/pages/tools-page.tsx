"use client";

import { Skeleton } from "~/components/ui/skeleton";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { ToolsSection } from "../sections/tools-section";

export function ToolsPage() {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });

  if (isLoading || !settings) {
    return <ToolsPageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <ToolsSection settings={settings} />
      </div>
    </div>
  );
}

function ToolsPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}
