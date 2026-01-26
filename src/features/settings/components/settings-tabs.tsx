"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  KeyIcon,
  LogOutIcon,
  MenuIcon,
  PaletteIcon,
  PaperclipIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { signOut } from "~/features/auth/lib/auth-client";
import { cn } from "~/lib/utils";

import { Button } from "../../../components/ui/button";
import { DialogClose } from "../../../components/ui/dialog";
import { Separator } from "../../../components/ui/separator";
import { AttachmentsTab } from "./tabs/attachments-tab";
import { IntegrationsTab } from "./tabs/integrations-tab";
import { InterfaceTab } from "./tabs/interface-tab";
import { ModelsTab } from "./tabs/models-tab";
import { PreferencesTab } from "./tabs/preferences-tab";
import { ProfileTab } from "./tabs/profile-tab";

type TabId = "profile" | "interface" | "preferences" | "integrations" | "models" | "attachments";

type TabConfig = {
  id: TabId;
  label: string;
  icon: typeof UserIcon;
};

const tabs: TabConfig[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "interface", label: "Interface", icon: PaletteIcon },
  { id: "preferences", label: "Chat & AI", icon: SettingsIcon },
  { id: "integrations", label: "Integrations", icon: KeyIcon },
  { id: "models", label: "Models", icon: SparklesIcon },
  { id: "attachments", label: "Attachments", icon: PaperclipIcon },
];

export function SettingsTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeTab = (searchParams.get("settings") as TabId) || "profile";

  const setActiveTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("settings", tab);
      params.delete("referrer");
      router.push(`?${params.toString()}`, { scroll: false });
      setSidebarOpen(false);
    },
    [router, searchParams],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    queryClient.removeQueries();
    router.push("/auth");
  }, [router, queryClient]);

  return (
    <div className={`
      flex h-full w-full flex-col
      md:flex-row
    `}
    >
      {/* Mobile header with hamburger */}
      <div className={`
        bg-muted/30 flex items-center justify-between border-b p-4
        md:hidden
      `}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <MenuIcon className="size-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <DialogClose asChild>
          <Button variant="ghost" size="icon-sm">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          `
            bg-card flex flex-col border-r
            md:bg-muted/30 md:min-w-50 md:shrink-0
          `,
          !sidebarOpen && "hidden",
          sidebarOpen && "md:hidden",
          `
            absolute inset-0 top-16 z-40 w-full
            md:relative md:inset-auto md:flex md:w-auto
          `,
        )}
      >
        <div className={`
          hidden items-center justify-between p-4
          md:flex
        `}
        >
          <h2 className="text-lg font-semibold">Settings</h2>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-4"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </div>

        <Separator className={`
          hidden
          md:block
        `}
        />

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

        <Separator className={`
          hidden
          md:block
        `}
        />

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
    case "interface":
      return <InterfaceTab />;
    case "preferences":
      return <PreferencesTab />;
    case "integrations":
      return <IntegrationsTab />;
    case "models":
      return <ModelsTab />;
    case "attachments":
      return <AttachmentsTab />;
    default:
      return <ProfileTab />;
  }
}
