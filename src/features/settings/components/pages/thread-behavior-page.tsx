"use client";

import { Skeleton } from "~/components/ui/skeleton";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { useSubscription } from "~/features/subscriptions/hooks/use-subscription";

import { ChatBehaviorSection } from "../sections/chat-behavior-section";

export function ThreadBehaviorPage() {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });
  const { data: subscription } = useSubscription();

  if (isLoading || !settings) {
    return <ThreadBehaviorPageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <ChatBehaviorSection settings={settings} tier={subscription?.tier} />
      </div>
    </div>
  );
}

function ThreadBehaviorPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3 w-72" />
        </div>
      </div>
    </div>
  );
}
