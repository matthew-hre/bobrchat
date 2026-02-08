"use client";

import type { ReactNode } from "react";

import type { UserSettingsContextValue } from "~/features/settings/settings-context";

import { UserSettingsContext } from "~/features/settings/settings-context";

type UserSettingsProviderProps = {
  settings: UserSettingsContextValue;
  children: ReactNode;
};

export function UserSettingsProvider({ settings, children }: UserSettingsProviderProps) {
  return (
    <UserSettingsContext value={settings}>
      {children}
    </UserSettingsContext>
  );
}
