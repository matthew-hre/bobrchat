import { KeyIcon } from "lucide-react";
import Link from "next/link";

import type { Session } from "~/lib/auth";

import { cn } from "~/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type UserProfileCardProps = {
  session: Session;
  hasApiKey?: boolean;
};

export function UserProfileCard({ session, hasApiKey }: UserProfileCardProps) {
  if (!session) {
    return null;
  }

  return (
    <Link
      href="?settings=profile"
      className={cn(`
        hover:bg-muted/50
        group/user flex cursor-pointer items-center gap-3 p-6 py-4
        transition-colors
      `)}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarImage src={session.user.image || undefined} alt={session.user.name} />
        <AvatarFallback className={cn(`
          from-primary/20 to-primary/5 ring-primary/20 bg-linear-to-br ring-2
        `)}
        >
          {session.user.name?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {session.user.name}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">
            <KeyIcon className="size-3" />
          </span>
          <span className="text-muted-foreground text-[10px]">
            {hasApiKey ? "API key configured" : "No API key"}
          </span>
        </div>
      </div>
    </Link>
  );
}
