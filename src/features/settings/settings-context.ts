"use client";

import { createContext } from "react";

import type { UserSettingsData } from "~/features/settings/types";

export type UserSettingsContextValue = UserSettingsData | null;

export const UserSettingsContext = createContext<UserSettingsContextValue>(null);
