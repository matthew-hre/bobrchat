"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  BoltIcon,
  DatabaseIcon,
  KeyboardIcon,
  KeyIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquarePlusIcon,
  PaletteIcon,
  ShieldIcon,
  SparklesIcon,
  UserIcon,
  WrenchIcon,
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
import { cn } from "~/lib/utils";

import { AdvancedPage } from "./pages/advanced-page";
import { AppearancePage } from "./pages/appearance-page";
import { DataPage } from "./pages/data-page";
import { InputPage } from "./pages/input-page";
import { NewThreadPage } from "./pages/new-thread-page";
import { ProfilePage } from "./pages/profile-page";
import { SecurityPage } from "./pages/security-page";
import { ThreadBehaviorPage } from "./pages/thread-behavior-page";
import { ToolsPage } from "./pages/tools-page";
import { AttachmentsTab } from "./tabs/attachments-tab";
import { IntegrationsTab } from "./tabs/integrations-tab";
import { ModelsTab } from "./tabs/models-tab";
import { SubscriptionCard } from "./ui/subscription-card";
import { UserAvatar } from "./ui/user-avatar";

type SectionId =
  | "appearance"
  | "input"
  | "new-thread"
  | "thread-behavior"
  | "tools"
  | "advanced"
  | "models"
  | "integrations"
  | "profile"
  | "security"
  | "attachments"
  | "data";

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
    label: "Appearance",
    items: [
      { id: "appearance", label: "Theme & Colors", icon: PaletteIcon },
      { id: "input", label: "Input & Controls", icon: KeyboardIcon },
    ],
  },
  {
    label: "Chat",
    items: [
      { id: "new-thread", label: "New Thread", icon: MessageSquarePlusIcon },
      { id: "thread-behavior", label: "Thread Behavior", icon: BoltIcon },
      { id: "tools", label: "Tools", icon: WrenchIcon },
      { id: "advanced", label: "Advanced", icon: SparklesIcon },
    ],
  },
  {
    label: "AI",
    items: [
      { id: "models", label: "Models", icon: SparklesIcon },
      { id: "integrations", label: "Integrations", icon: KeyIcon },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", icon: UserIcon },
      { id: "security", label: "Security", icon: ShieldIcon },
      { id: "attachments", label: "Attachments", icon: DatabaseIcon },
      { id: "data", label: "Data Management", icon: DatabaseIcon },
    ],
  },
];

const allNavItems = navGroups.flatMap(g => g.items);

const keyboardShortcuts = [
  { label: "Toggle Sidebar", keys: ["Ctrl", "B"] },
  { label: "Focus Search", keys: ["/"] },
  { label: "Model Selector", keys: ["Ctrl", "M"] },
  { label: "Open Settings", keys: ["Ctrl", ","] },
  { label: "Unfocus Input", keys: ["Esc"] },
];

// Map old tab param values to new section IDs for backwards compat
const tabToSection: Record<string, SectionId> = {
  interface: "appearance",
  preferences: "thread-behavior",
  integrations: "integrations",
  models: "models",
  attachments: "attachments",
  auth: "profile",
};

type SettingsPageProps = {
  initialTab?: string;
};

export function SettingsPage({ initialTab = "appearance" }: SettingsPageProps) {
  const queryClient = useQueryClient();
  const { previousRoute } = usePreviousRoute();
  const resolvedInitial = tabToSection[initialTab] ?? (initialTab as SectionId);
  const [activeSection, setActiveSection] = useState<SectionId>(
    allNavItems.some(i => i.id === resolvedInitial) ? resolvedInitial : "appearance",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: settings } = useUserSettings({ enabled: true });

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

  return (
    <div className="flex h-full w-full overflow-auto">
      <div className="mx-auto flex w-full max-w-6xl">
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
              <div className="px-4 pb-2">
                <BackToChatButton />
              </div>

              {/* Profile Card */}
              <div className="px-4 py-2">
                <DesktopProfileCard />
              </div>

              <Separator className="mx-4 my-2" />

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
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <Separator className="mx-4 my-2" />

              {/* Sign Out */}
              <div className="px-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={`
                    text-muted-foreground flex w-full items-center gap-3
                    rounded-md px-3 py-1.5 text-sm font-medium
                    transition-colors
                    hover:bg-destructive/10 hover:text-destructive
                  `}
                >
                  <LogOutIcon className="size-4" />
                  Sign Out
                </button>
              </div>

              {/* Subscription Card */}
              <div className="px-4 py-2">
                <SubscriptionCard />
              </div>

              {/* Keyboard Shortcuts */}
              <div className="px-4 py-2">
                <div className="bg-card rounded-lg p-4">
                  <h3 className={`
                    text-muted-foreground mb-3 text-xs font-semibold
                    tracking-wider uppercase
                  `}
                  >
                    Keyboard Shortcuts
                  </h3>
                  <div className="space-y-2">
                    {keyboardShortcuts.map(shortcut => (
                      <div
                        key={shortcut.label}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{shortcut.label}</span>
                        <div className="flex gap-1">
                          {shortcut.keys.map(key => (
                            <kbd
                              key={key}
                              className={`
                                bg-background text-muted-foreground rounded
                                px-1.5 py-0.5 font-mono text-xs
                              `}
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content Area */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Desktop Header */}
          <header className={`
            bg-background hidden border-b px-6 pt-14 pb-4
            md:block
          `}
          >
            <h1 className="text-xl font-semibold">{activeNavItem?.label}</h1>
          </header>

          {/* Mobile Header */}
          <header className={`
            bg-sidebar text-sidebar-foreground border-sidebar-border flex
            min-h-14 items-center gap-3 border-b px-3
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
                  <MobileProfileCard />
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
                                    flex items-center gap-3 rounded-md px-3
                                    py-2 text-sm font-medium whitespace-nowrap
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

            <span className="text-base font-semibold">{activeNavItem?.label}</span>

            <div className="ml-auto">
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
            </div>
          </header>

          {/* Section Content */}
          <div className={cn(
            "flex-1 overflow-auto",
            activeSection === "models" && "flex min-h-0 flex-col",
          )}
          >
            {activeSection === "appearance" && <AppearancePage />}
            {activeSection === "input" && <InputPage />}
            {activeSection === "new-thread" && <NewThreadPage />}
            {activeSection === "thread-behavior" && <ThreadBehaviorPage />}
            {activeSection === "tools" && <ToolsPage />}
            {activeSection === "advanced" && <AdvancedPage />}
            {activeSection === "models" && <ModelsTab />}
            {activeSection === "integrations" && <IntegrationsTab />}
            {activeSection === "profile" && <ProfilePage />}
            {activeSection === "security" && <SecurityPage />}
            {activeSection === "attachments" && <AttachmentsTab />}
            {activeSection === "data" && <DataPage />}
          </div>
        </main>
      </div>
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

function DesktopProfileCard() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center gap-3 px-1">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3 px-1">
      <UserAvatar session={session} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {session?.user?.name || "Unnamed User"}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {session?.user?.email || "No email"}
        </p>
      </div>
    </div>
  );
}

function MobileProfileCard() {
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
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar session={session} />
      <div className="min-w-0">
        <p className="truncate font-medium">{session?.user?.name || "Unnamed User"}</p>
        <p className="text-muted-foreground truncate text-sm">{session?.user?.email || "No email"}</p>
      </div>
    </div>
  );
}
