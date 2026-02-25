"use client";

import BoringAvatar from "boring-avatars";
import Link from "next/link";

import type { Session } from "~/features/auth/lib/auth";
import type { ProfileCardWidget } from "~/features/settings/types";

import { useSession } from "~/features/auth/lib/auth-client";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { cn } from "~/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ApiKeyStatusWidget } from "./widgets/api-key-status-widget";
import { OpenRouterCreditsWidget } from "./widgets/openrouter-credits-widget";
import { StorageQuotaWidget } from "./widgets/storage-quota-widget";

type UserProfileCardProps = {
  session: Session;
};

const widgetComponents: Record<ProfileCardWidget, React.ComponentType> = {
  apiKeyStatus: ApiKeyStatusWidget,
  openrouterCredits: OpenRouterCreditsWidget,
  storageQuota: StorageQuotaWidget,
};

export function UserProfileCard({ session }: UserProfileCardProps) {
  const { data: settings } = useUserSettings({ enabled: true });
  const { data: clientSession } = useSession();

  if (!session) {
    return null;
  }

  const name = clientSession?.user?.name || session.user.name;
  const image = clientSession?.user?.image ?? session.user.image;
  const widgetKey = settings?.profileCardWidget ?? "apiKeyStatus";
  const WidgetComponent = widgetComponents[widgetKey];

  return (
    <Link
      href="/settings"
      className={cn(`
        hover:bg-card
        group/user flex cursor-pointer items-center gap-3 p-6 py-4
        transition-colors
      `)}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarImage src={image || undefined} alt={name} />
        <AvatarFallback className="bg-transparent p-0">
          {image
            ? null
            : (
                <BoringAvatar
                  size={36}
                  name={name || "user"}
                  variant="beam"
                  colors={["#F92672", "#A1EFE4", "#FD971F", "#E6DB74", "#66D9EF"]}
                />
              )}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {name}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <WidgetComponent />
        </span>
      </div>
    </Link>
  );
}
