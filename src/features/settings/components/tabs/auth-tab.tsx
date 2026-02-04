"use client";

import { Skeleton } from "~/components/ui/skeleton";
import { useSession } from "~/features/auth/lib/auth-client";
import { useHasCredentialAccount } from "~/features/settings/hooks/use-has-credential-account";

import { ChangeEmailSection } from "../sections/change-email-section";
import { ChangeNameSection } from "../sections/change-name-section";
import { ChangePasswordSection } from "../sections/change-password-section";
import { DeleteAccountSection } from "../sections/delete-account-section";
import { TwoFactorSection } from "../sections/two-factor-section";
import { SettingsSection } from "../ui/settings-section";

export function AuthTab() {
  const { data: session, isPending } = useSession();
  const hasCredentialAccount = useHasCredentialAccount();

  if (isPending || hasCredentialAccount === null) {
    return <AuthTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-8 p-6">
        <SettingsSection
          title="Account"
          description="Manage your account details."
        >
          <ChangeNameSection currentName={session?.user?.name || ""} />
          {hasCredentialAccount && <ChangeEmailSection />}
          {hasCredentialAccount && <ChangePasswordSection />}
        </SettingsSection>

        <TwoFactorSection hasCredentialAccount={hasCredentialAccount} />

        <DeleteAccountSection />
      </div>
    </div>
  );
}

function AuthTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-8 p-6">
        <div className="space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
