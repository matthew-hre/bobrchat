"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  KeyIcon,
  LogOutIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { signOut } from "~/lib/auth-client";
import { cn } from "~/lib/utils";

import { Button } from "../ui/button";
import { DialogClose } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { IntegrationsTab } from "./integrations-tab";
import { ModelsTab } from "./models/models-tab";
import { PreferencesTab } from "./preferences-tab";
import { ProfileTab } from "./profile-tab";

type TabId = "profile" | "preferences" | "integrations" | "models";

type TabConfig = {
  id: TabId;
  label: string;
  icon: typeof UserIcon;
};

const tabs: TabConfig[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "preferences", label: "Preferences", icon: SettingsIcon },
  { id: "integrations", label: "Integrations", icon: KeyIcon },
  { id: "models", label: "Models", icon: SparklesIcon },
];

export function SettingsTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const activeTab = (searchParams.get("tab") as TabId) || "profile";

  const setActiveTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      params.delete("referrer");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    queryClient.removeQueries();
    router.push("/");
  }, [router, queryClient]);

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div
        className={cn(`bg-muted/30 flex w-50 shrink-0 flex-col border-r`)}
      >
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm">
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </div>

        <Separator />

        <nav className="flex flex-1 flex-col gap-1 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  `
                    flex items-center gap-3 rounded-md px-3 py-2 text-sm
                    font-medium transition-colors
                  `,
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : `
                      text-muted-foreground
                      hover:bg-muted hover:text-foreground
                    `,
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <Separator />

        <div className="p-2">
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(`
              text-muted-foreground flex w-full items-center gap-3 rounded-md
              px-3 py-4 text-sm font-medium transition-colors
              hover:bg-destructive/10 hover:text-destructive
            `)}
          >
            <LogOutIcon className="size-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TabContent activeTab={activeTab} />
      </div>
    </div>
  );
}

function TabContent({ activeTab }: { activeTab: TabId }) {
  switch (activeTab) {
    case "profile":
      return <ProfileTab />;
    case "preferences":
      return <PreferencesTab />;
    case "integrations":
      return <IntegrationsTab />;
    case "models":
      return <ModelsTab />;
    default:
      return <ProfileTab />;
  }
}
