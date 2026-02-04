"use client";

import BoringAvatar from "boring-avatars";
import { KeyIcon, LoaderIcon } from "lucide-react";
import Link from "next/link";

import type { Session } from "~/features/auth/lib/auth";

import { useApiKeyStatus } from "~/features/settings/hooks/use-api-status";
import { cn } from "~/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type UserProfileCardProps = {
  session: Session;
};

export function UserProfileCard({ session }: UserProfileCardProps) {
  const { hasKey: hasOpenRouterKey, isLoading: isOpenRouterLoading } = useApiKeyStatus("openrouter");
  const { hasKey: hasParallelKey, isLoading: isParallelLoading } = useApiKeyStatus("parallel");

  if (!session) {
    return null;
  }

  const isLoading = isOpenRouterLoading || isParallelLoading;

  const getApiKeyStatus = () => {
    if (!hasOpenRouterKey && !hasParallelKey) {
      return "No API Keys Set";
    }
    if (hasOpenRouterKey && !hasParallelKey) {
      return "OpenRouter Key Set";
    }
    if (!hasOpenRouterKey && hasParallelKey) {
      return "No OpenRouter Key Set";
    }
    return "All API Keys Set";
  };

  return (
    <Link
      href="/settings"
      className={cn(`
        hover:bg-muted/50
        group/user flex cursor-pointer items-center gap-3 p-6 py-4
        transition-colors
      `)}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarImage src={session.user.image || undefined} alt={session.user.name} />
        <AvatarFallback className="bg-transparent p-0">
          {session.user.image
            ? null
            : (
                <BoringAvatar
                  size={36}
                  name={session.user.name || "user"}
                  variant="beam"
                  colors={["#F92672", "#A1EFE4", "#FD971F", "#E6DB74", "#66D9EF"]}
                />
              )}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {session.user.name}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          {isLoading
            ? (
                <>
                  <LoaderIcon className={`
                    text-muted-foreground size-3 animate-spin
                  `}
                  />
                  Checking API keys...
                </>
              )
            : (
                <>
                  <KeyIcon className="text-muted-foreground size-3" />
                  {getApiKeyStatus()}
                </>
              )}
        </span>
      </div>
    </Link>
  );
}
