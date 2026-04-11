"use client";

import type {
  ShieldIcon,
} from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";
import {
  ActivityIcon,
  ArrowLeftIcon,
  BarChart3Icon,
  BoltIcon,
  BrainIcon,
  CpuIcon,
  CreditCardIcon,
  DatabaseIcon,
  KeyboardIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquarePlusIcon,
  PaletteIcon,
  PanelLeftIcon,
  PlugIcon,
  SlidersIcon,
  TagsIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useLayoutEffect, useState } from "react";

import { applyAccentColor } from "~/components/theme/theme-initializer";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { handleSignOut as signOutAction } from "~/features/auth/actions";
import { useSession } from "~/features/auth/lib/auth-client";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { usePreviousRoute } from "~/features/settings/previous-route-context";
import { useSubscription } from "~/features/subscriptions/hooks/use-subscription";
import { cn } from "~/lib/utils";

import { AdvancedPage } from "./pages/advanced-page";
import { InputPage } from "./pages/input-page";
import { NewThreadPage } from "./pages/new-thread-page";
import { ProfilePage } from "./pages/profile-page";
import { SidebarPage } from "./pages/sidebar-page";
import { SubscriptionPage } from "./pages/subscription-page";
import { TagsPage } from "./pages/tags-page";
import { ThemePage } from "./pages/theme-page";
import { ThreadAutomationPage } from "./pages/thread-automation-page";
import { ToolsPage } from "./pages/tools-page";
import { UsageModelsPage } from "./pages/usage-models-page";
import { UsageOverviewPage } from "./pages/usage-overview-page";
import { UsageToolsPage } from "./pages/usage-tools-page";
import { AttachmentsTab } from "./tabs/attachments-tab";
import { IntegrationsTab } from "./tabs/integrations-tab";
import { ModelsTab } from "./tabs/models-tab";
import { UserAvatar } from "./ui/user-avatar";

type SectionId
  = | "subscription"
    | "usage-overview"
    | "usage-models"
    | "usage-tools"
    | "theme"
    | "sidebar"
    | "input"
    | "new-thread"
    | "thread-automation"
    | "tags"
    | "tools"
    | "advanced"
    | "models"
    | "integrations"
    | "profile"
    | "attachments";

type NavItem = {
  id: SectionId;
  label: string;
  icon: typeof ShieldIcon;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Subscription",
    items: [
      { id: "subscription", label: "Plan & Billing", icon: CreditCardIcon },
    ],
  },
  {
    label: "Appearance",
    items: [
      { id: "theme", label: "Theme, Colors & Fonts", icon: PaletteIcon },
      { id: "sidebar", label: "Sidebar", icon: PanelLeftIcon },
      { id: "input", label: "Input & Controls", icon: KeyboardIcon },
    ],
  },
  {
    label: "Chat",
    items: [
      { id: "new-thread", label: "New Threads", icon: MessageSquarePlusIcon },
      { id: "thread-automation", label: "Thread Automation", icon: BoltIcon },
      { id: "tags", label: "Tags", icon: TagsIcon },
      { id: "tools", label: "Tools", icon: WrenchIcon },
    ],
  },
  {
    label: "AI",
    items: [
      { id: "models", label: "Models", icon: BrainIcon },
      { id: "integrations", label: "Integrations", icon: PlugIcon },
      { id: "advanced", label: "Advanced Features", icon: SlidersIcon },
    ],
  },
  {
    label: "Usage",
    items: [
      { id: "usage-overview", label: "Overview", icon: BarChart3Icon },
      { id: "usage-models", label: "Models", icon: CpuIcon },
      { id: "usage-tools", label: "Tools", icon: ActivityIcon },
      { id: "attachments", label: "Attachments", icon: DatabaseIcon },
    ],
  },
];

const allNavItems = navGroups.flatMap(g => g.items);

// Map old tab/section param values to new section IDs for backwards compat
const sectionAliases: Record<string, SectionId> = {
  "interface": "theme",
  "appearance": "theme",
  "fonts": "theme",
  "model-display": "theme",
  "thread-behavior": "thread-automation",
  "thread-settings": "new-thread",
  "data": "profile",
  "preferences": "thread-automation",
  "tags": "tags",
  "integrations": "integrations",
  "models": "models",
  "attachments": "attachments",
  "auth": "profile",
  "security": "profile",
  "billing": "subscription",
  "usage": "usage-overview",
  "metrics": "usage-overview",
};

type SettingsPageProps = {
  initialTab?: string;
  isModal?: boolean;
  onClose?: () => void;
};

export function SettingsPage({ initialTab = "theme", isModal = false, onClose }: SettingsPageProps) {
  const queryClient = useQueryClient();
  const { previousRoute } = usePreviousRoute();
  const resolvedInitial = sectionAliases[initialTab] ?? (initialTab as SectionId);
  const isValidSection = resolvedInitial === "profile" || allNavItems.some(i => i.id === resolvedInitial);
  const [activeSection, setActiveSection] = useState<SectionId>(
    isValidSection ? resolvedInitial : "theme",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: settings } = useUserSettings({ enabled: true });
  const { data: subscription } = useSubscription();

  useLayoutEffect(() => {
    if (settings?.accentColor) {
      applyAccentColor(settings.accentColor);
    }
  }, [settings?.accentColor]);

  const handleSectionChange = useCallback((section: SectionId) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    window.history.replaceState(null, "", `/settings?section=${section}`);
  }, []);

  const handleSignOut = useCallback(async () => {
    queryClient.removeQueries();
    await signOutAction();
  }, [queryClient]);

  const activeNavItem = allNavItems.find(item => item.id === activeSection);
  const activeLabel = activeSection === "profile" ? "Profile & Security" : activeNavItem?.label;

  return (
    <div className="flex h-full w-full overflow-auto">
      {/* Desktop Sidebar Navigation */}
      <aside className={`
        bg-background text-sidebar-foreground relative hidden w-72 shrink-0
        flex-col
        md:flex
      `}
      >
        {/* Fading border */}
        <div className={`
          from-border absolute top-0 right-0 h-full w-px bg-linear-to-b
          to-transparent
        `}
        />

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 py-4">
            {/* Back to Thread */}
            {!isModal && (
              <div className="px-4 pb-2">
                <BackToChatButton />
              </div>
            )}

            {/* Profile Card — clickable, navigates to Profile section */}
            <div className="px-2">
              <DesktopProfileCard
                isActive={activeSection === "profile"}
                onClick={() => handleSectionChange("profile")}
              />
            </div>

            <Separator className="my-2" />

            {/* Navigation Groups */}
            {navGroups.map(group => (
              <div key={group.label} className="px-2 py-1">
                <h3 className={`
                  text-muted-foreground px-3 pb-1 text-xs font-semibold
                  tracking-wider uppercase
                `}
                >
                  {group.label}
                </h3>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSectionChange(item.id)}
                        className={cn(
                          `
                            flex items-center gap-3 rounded-md px-3 py-1.5
                            text-sm font-medium transition-colors
                          `,
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : `
                              text-muted-foreground
                              hover:bg-accent/50 hover:text-foreground
                            `,
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                        {item.id === "subscription" && subscription?.tier && (
                          <span className={cn(
                            `
                              ml-auto rounded-full px-2 py-0.5 text-[10px]
                              leading-none font-semibold uppercase
                            `,
                            subscription.tier === "free"
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary",
                          )}
                          >
                            {subscription.tier}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <Separator className="my-2" />

            {/* Sign Out */}
            <div className="px-2">
              <button
                type="button"
                onClick={handleSignOut}
                className={`
                  text-muted-foreground flex w-full items-center gap-3
                  rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                  hover:bg-destructive/10 hover:text-destructive
                `}
              >
                <LogOutIcon className="size-4" />
                Sign Out
              </button>
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content Area */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Desktop Header */}
        <header className={`
          bg-background hidden items-center justify-between border-b px-8 pt-5
          pb-5
          md:flex
        `}
        >
          <h1 className="text-lg font-semibold">{activeLabel}</h1>
          {isModal && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7"
              title="Close settings"
              onClick={onClose}
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </header>

        {/* Mobile Header */}
        <header className={`
          bg-sidebar text-sidebar-foreground border-sidebar-border flex min-h-14
          items-center gap-3 border-b px-4
          md:hidden
        `}
        >
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-7">
                <MenuIcon className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="bg-sidebar text-sidebar-foreground w-72 p-0"
            >
              <SheetHeader className={`
                flex h-14 flex-row items-center gap-2 border-b px-4
              `}
              >
                <Image
                  src="/icon.png"
                  alt="BobrChat Logo"
                  width={64}
                  height={64}
                  className="size-8"
                />
                <SheetTitle className="text-base font-semibold tracking-tight">
                  Settings
                </SheetTitle>
              </SheetHeader>

              <div className="p-4">
                <MobileProfileCard onClick={() => handleSectionChange("profile")} />
              </div>

              <Separator />

              <ScrollArea className="flex-1">
                <div className="py-2">
                  {navGroups.map(group => (
                    <div key={group.label} className="px-2 py-1">
                      <h3 className={`
                        text-muted-foreground px-3 pb-1 text-xs font-semibold
                        tracking-wider uppercase
                      `}
                      >
                        {group.label}
                      </h3>
                      <div className="flex flex-col gap-0.5">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeSection === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSectionChange(item.id)}
                              className={cn(
                                `
                                  flex items-center gap-3 rounded-md px-3 py-2
                                  text-sm font-medium whitespace-nowrap
                                  transition-colors
                                `,
                                isActive
                                  ? `
                                    bg-sidebar-accent
                                    text-sidebar-accent-foreground
                                  `
                                  : `
                                    text-sidebar-foreground/70
                                    hover:bg-sidebar-accent
                                    hover:text-sidebar-accent-foreground
                                  `,
                              )}
                            >
                              <Icon className="size-4" />
                              {item.label}
                              {item.id === "subscription" && subscription?.tier && (
                                <span className={cn(
                                  `
                                    ml-auto rounded-full px-2 py-0.5 text-[10px]
                                    leading-none font-semibold uppercase
                                  `,
                                  subscription.tier === "free"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-primary/10 text-primary",
                                )}
                                >
                                  {subscription.tier}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator />

              <div className="p-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={`
                    text-sidebar-foreground/70 flex w-full items-center gap-3
                    rounded-md px-3 py-2 text-sm font-medium transition-colors
                    hover:bg-destructive/10 hover:text-destructive
                  `}
                >
                  <LogOutIcon className="size-4" />
                  Sign Out
                </button>
              </div>
            </SheetContent>
          </Sheet>

          <span className="text-base font-semibold">{activeLabel}</span>

          <div className="ml-auto">
            {isModal
              ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    title="Close settings"
                    onClick={onClose}
                  >
                    <XIcon className="size-4" />
                  </Button>
                )
              : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    title="Back to chat"
                    asChild
                  >
                    <Link href={previousRoute}>
                      <ArrowLeftIcon className="size-4" />
                    </Link>
                  </Button>
                )}
          </div>
        </header>

        {/* Section Content */}
        <div className={cn(
          "flex-1 overflow-auto",
          activeSection === "models" && "flex min-h-0 flex-col",
        )}
        >
          {activeSection === "subscription" && <SubscriptionPage />}
          {activeSection === "usage-overview" && <UsageOverviewPage />}
          {activeSection === "usage-models" && <UsageModelsPage />}
          {activeSection === "usage-tools" && <UsageToolsPage />}
          {activeSection === "theme" && <ThemePage />}
          {activeSection === "sidebar" && <SidebarPage />}
          {activeSection === "input" && <InputPage />}
          {activeSection === "new-thread" && <NewThreadPage />}
          {activeSection === "thread-automation" && <ThreadAutomationPage />}
          {activeSection === "tags" && <TagsPage settings={settings ?? undefined} />}
          {activeSection === "tools" && <ToolsPage />}
          {activeSection === "advanced" && <AdvancedPage />}
          {activeSection === "models" && <ModelsTab />}
          {activeSection === "integrations" && <IntegrationsTab />}
          {activeSection === "profile" && <ProfilePage />}
          {activeSection === "attachments" && <AttachmentsTab />}
        </div>
      </main>
    </div>
  );
}

function BackToChatButton() {
  const { previousRoute } = usePreviousRoute();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      asChild
    >
      <Link href={previousRoute}>
        <ArrowLeftIcon className="size-4" />
        Back to Thread
      </Link>
    </Button>
  );
}

function DesktopProfileCard({
  isActive,
  onClick,
}: {
  isActive: boolean;
  onClick: () => void;
}) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center gap-3 rounded-md px-3 py-2">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        `
          flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left
          transition-colors
        `,
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50",
      )}
    >
      <UserAvatar session={session} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {session?.user?.name || "Unnamed User"}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {session?.user?.email || "No email"}
        </p>
      </div>
    </button>
  );
}

function MobileProfileCard({ onClick }: { onClick: () => void }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-3 text-left"
    >
      <UserAvatar session={session} />
      <div className="min-w-0">
        <p className="truncate font-medium">{session?.user?.name || "Unnamed User"}</p>
        <p className="text-muted-foreground truncate text-sm">{session?.user?.email || "No email"}</p>
      </div>
    </button>
  );
}
