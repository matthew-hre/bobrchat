"use client";

import { useEffect, useState } from "react";

import { authClient } from "~/features/auth/lib/auth-client";

export function useHasCredentialAccount() {
  const [hasCredentialAccount, setHasCredentialAccount] = useState<boolean | null>(null);

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      const hasCredential = data?.some(account => account.providerId === "credential") ?? false;
      setHasCredentialAccount(hasCredential);
    });
  }, []);

  return hasCredentialAccount;
}
