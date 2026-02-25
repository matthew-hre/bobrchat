"use client";

import { useAccessToken, useAuth } from "@workos-inc/authkit-nextjs/components";
import "@radix-ui/themes/styles.css";
import "@workos-inc/widgets/styles.css";
import { useQueryClient } from "@tanstack/react-query";
import {
  UserProfile,
  UserSecurity,
  WorkOsWidgets,
} from "@workos-inc/widgets";
import { useTheme } from "next-themes";
import { useCallback, useEffect } from "react";

import type { AccentColor } from "~/features/settings/types";

import { Skeleton } from "~/components/ui/skeleton";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

import { DeleteAccountSection } from "../sections/delete-account-section";
import { SettingsSection } from "../ui/settings-section";

const ACCENT_COLOR_MAP = {
  green: "grass",
  pink: "pink",
  cyan: "cyan",
  orange: "orange",
  yellow: "amber",
  blue: "blue",
  gray: "gray",
} as const;

function getRadixAccentColor(accentColor?: AccentColor): (typeof ACCENT_COLOR_MAP)[keyof typeof ACCENT_COLOR_MAP] {
  if (accentColor && typeof accentColor === "string" && accentColor in ACCENT_COLOR_MAP) {
    return ACCENT_COLOR_MAP[accentColor as keyof typeof ACCENT_COLOR_MAP];
  }
  return "grass";
}

export function AuthTab() {
  const { getAccessToken, loading: tokenLoading } = useAccessToken();
  const { refreshAuth } = useAuth();
  const { resolvedTheme } = useTheme();
  const { data: settings } = useUserSettings({ enabled: true });
  const queryClient = useQueryClient();

  useEffect(() => {
    const widgetMutationKeys = new Set(["updateMe", "updateMember", "createTotpFactor", "deleteTotpFactor"]);
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.mutation.state.status === "success") {
        const key = event.mutation.options.mutationKey?.[0];
        if (typeof key === "string" && widgetMutationKeys.has(key)) {
          refreshAuth();
        }
      }
    });
    return unsubscribe;
  }, [queryClient, refreshAuth]);

  const authToken = useCallback(
    async () => {
      const token = await getAccessToken();
      if (!token)
        throw new Error("Not authenticated");
      return token;
    },
    [getAccessToken],
  );

  if (tokenLoading) {
    return <AuthTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="w-full p-6">
        <WorkOsWidgets
          queryClient={queryClient}
          theme={{
            hasBackground: false,
            appearance: resolvedTheme === "dark" ? "dark" : "light",
            accentColor: getRadixAccentColor(settings?.accentColor),
            grayColor: "mauve",
            radius: "medium",
          }}
          className="space-y-8"
        >
          <SettingsSection
            title="Profile"
            description="Manage your name, email, and profile picture."
          >
            <UserProfile authToken={authToken} />
          </SettingsSection>

          <SettingsSection
            title="Security"
            description="Manage your password and multi-factor authentication."
          >
            <UserSecurity authToken={authToken} />
          </SettingsSection>

          <DeleteAccountSection />
        </WorkOsWidgets>
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
