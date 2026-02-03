"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  KeyIcon,
  LogOutIcon,
  PaletteIcon,
  PaperclipIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { signOut } from "~/features/auth/lib/auth-client";
import { cn } from "~/lib/utils";

const SIDEBAR_WIDTH_STORAGE_KEY = "sidebar_width";
const SIDEBAR_WIDTH_DEFAULT = 16;
const SIDEBAR_WIDTH_MIN = 14;
const SIDEBAR_WIDTH_MAX = 20;

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

type SettingsPageProps = {
  initialTab?: TabId;
};

export function SettingsPage({ initialTab = "profile" }: SettingsPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH_DEFAULT);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (stored) {
      const width = Math.max(SIDEBAR_WIDTH_MIN, Math.min(SIDEBAR_WIDTH_MAX, parseFloat(stored)));
      setSidebarWidth(width);
    }
  }, []);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `/settings?tab=${tab}`);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    queryClient.removeQueries();
    router.push("/auth");
  }, [router, queryClient]);

  return (
    <div className="flex h-full w-full">
      {/* Sidebar - matching ChatSidebar style */}
      <aside
        style={{ width: `${sidebarWidth}rem` }}
        className={`
          bg-sidebar text-sidebar-foreground border-sidebar-border flex
          h-full shrink-0 flex-col border-r
        `}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <Image
              src="/icon.png"
              alt="BobrChat Logo"
              width={64}
              height={64}
              className="size-8"
            />
            <span className="text-base font-semibold tracking-tight">
              Settings
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7"
            title="Back to chat"
            asChild
          >
            <Link href="/">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  `
                    flex items-center gap-3 rounded-md px-3 py-2 text-sm
                    font-medium transition-colors
                  `,
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : `
                      text-sidebar-foreground/70
                      hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
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

        {/* Sign out */}
        <div className="p-2">
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(`
              text-sidebar-foreground/70 flex w-full items-center gap-3
              rounded-md px-3 py-2 text-sm font-medium transition-colors
              hover:bg-destructive/10 hover:text-destructive
            `)}
          >
            <LogOutIcon className="size-4" />
            Sign Out
          </button>
        </div>
      </aside>

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
