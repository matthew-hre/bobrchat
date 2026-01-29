"use client";

import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

import {
  AdvancedFeaturesSection,
} from "../sections/advanced-features-section";
import {
  ChatBehaviorSection,
} from "../sections/chat-behavior-section";
import {
  DataManagementSection,
} from "../sections/data-management-section";

export function PreferencesTab() {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });

  if (isLoading || !settings) {
    return <PreferencesTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Chat & AI</h3>
        <p className="text-muted-foreground text-sm">
          Configure chat behavior and AI settings.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-8">
          <ChatBehaviorSection settings={settings} />

          <Separator />

          <AdvancedFeaturesSection settings={settings} />

          <Separator />

          <DataManagementSection />
        </div>
      </div>
    </div>
  );
}

function PreferencesTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-3 w-72" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-30 w-full" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </div>
    </div>
  );
}
