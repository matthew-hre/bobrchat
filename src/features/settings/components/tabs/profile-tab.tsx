"use client";

import BoringAvatar from "boring-avatars";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { useSession } from "~/features/auth/lib/auth-client";
import { useHasCredentialAccount } from "~/features/settings/hooks/use-has-credential-account";

import {
  ChangeEmailSection,
} from "../sections/change-email-section";
import {
  ChangeNameSection,
} from "../sections/change-name-section";
import {
  ChangePasswordSection,
} from "../sections/change-password-section";
import {
  DeleteAccountSection,
} from "../sections/delete-account-section";
import {
  TwoFactorSection,
} from "../sections/two-factor-section";

export function ProfileTab() {
  const { data: session, isPending } = useSession();
  const hasCredentialAccount = useHasCredentialAccount();

  if (isPending || hasCredentialAccount === null) {
    return <ProfileTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Profile</h3>
        <p className="text-muted-foreground text-sm">
          Manage your account details and personal information.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="size-20">
              <AvatarImage
                src={session?.user?.image || undefined}
                alt={session?.user?.name || "User"}
              />
              <AvatarFallback className="bg-transparent p-0">
                {session?.user?.image
                  ? null
                  : (
                      <BoringAvatar
                        size={80}
                        name={session?.user?.name || "user"}
                        variant="beam"
                        colors={["#F92672", "#A1EFE4", "#FD971F", "#E6DB74", "#66D9EF"]}
                      />
                    )}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-center text-xl font-medium">
                {session?.user?.name || "Unnamed User"}
              </h2>
              <p className="text-muted-foreground text-center text-sm">
                {session?.user?.email || "No email available"}
              </p>
            </div>
          </div>

          <Separator />

          <ChangeNameSection currentName={session?.user?.name || ""} />

          {hasCredentialAccount && <ChangeEmailSection />}

          {hasCredentialAccount && <ChangePasswordSection />}

          <TwoFactorSection hasCredentialAccount={hasCredentialAccount} />

          <Separator />

          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
}

function ProfileTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-72" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
