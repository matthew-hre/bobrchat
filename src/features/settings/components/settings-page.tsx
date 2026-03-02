"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  KeyIcon,
  LogOutIcon,
  MenuIcon,
  PaletteIcon,
  PaperclipIcon,
  SettingsIcon,
  ShieldIcon,
  SparklesIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { applyAccentColor } from "~/components/theme/theme-initializer";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { handleSignOut as signOutAction } from "~/features/auth/actions";
import { useSession } from "~/features/auth/lib/auth-client";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { usePreviousRoute } from "~/features/settings/previous-route-context";
import { cn } from "~/lib/utils";

import { AttachmentsTab } from "./tabs/attachments-tab";
import { AuthTab } from "./tabs/auth-tab";
import { IntegrationsTab } from "./tabs/integrations-tab";
import { InterfaceTab } from "./tabs/interface-tab";
import { ModelsTab } from "./tabs/models-tab";
import { PreferencesTab } from "./tabs/preferences-tab";
import { SubscriptionCard } from "./ui/subscription-card";
import { UserAvatar } from "./ui/user-avatar";

type TabId = "interface" | "preferences" | "integrations" | "models" | "attachments" | "auth";

type TabConfig = {
  id: TabId;
  label: string;
  icon: typeof ShieldIcon;
};

const tabs: TabConfig[] = [
  { id: "interface", label: "Interface", icon: PaletteIcon },
  { id: "preferences", label: "Thread & AI", icon: SettingsIcon },
  { id: "integrations", label: "Integrations", icon: KeyIcon },
  { id: "models", label: "Models", icon: SparklesIcon },
  { id: "attachments", label: "Attachments", icon: PaperclipIcon },
  { id: "auth", label: "Auth", icon: ShieldIcon },
];

const keyboardShortcuts = [
  { label: "Toggle Sidebar", keys: ["Ctrl", "B"] },
  { label: "Focus Search", keys: ["/"] },
  { label: "Model Selector", keys: ["Ctrl", "M"] },
  { label: "Open Settings", keys: ["Ctrl", ","] },
  { label: "Unfocus Input", keys: ["Esc"] },
];

type SettingsPageProps = {
  initialTab?: TabId;
};

export function SettingsPage({ initialTab = "interface" }: SettingsPageProps) {
  const queryClient = useQueryClient();
  const { previousRoute } = usePreviousRoute();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: settings } = useUserSettings({ enabled: true });

  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Apply accent color before paint to prevent flicker
  useLayoutEffect(() => {
    if (settings?.accentColor) {
      applyAccentColor(settings.accentColor);
    }
  }, [settings?.accentColor]);

  const updateScrollState = useCallback(() => {
    const el = tabsRef.current;
    if (!el)
      return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  const scrollTabToCenter = useCallback((tabId: TabId) => {
    const el = tabsRef.current;
    if (!el)
      return;
    const button = el.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement | null;
    if (button) {
      button.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
    }
  }, []);

  useEffect(() => {
    updateScrollState();
    scrollTabToCenter(activeTab);
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateScrollState]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.history.replaceState(null, "", `/settings?tab=${tab}`);
    scrollTabToCenter(tab);
  }, [scrollTabToCenter]);

  const handleSignOut = useCallback(async () => {
    queryClient.removeQueries();
    await signOutAction();
  }, [queryClient]);

  const activeTabConfig = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="flex h-full w-full overflow-auto">
      <div className="mx-auto flex w-full max-w-6xl">
        {/* Desktop Profile Sidebar */}
        <ProfileSidebar onSignOut={handleSignOut} />

        {/* Main Content Area */}
        <Tabs
          value={activeTab}
          onValueChange={v => handleTabChange(v as TabId)}
          className="flex min-w-0 flex-1 flex-col gap-0"
        >
          {/* Desktop Header with Horizontal Tabs */}
          <header className={`
            bg-background hidden px-6 pt-14 pb-4
            md:block
          `}
          >
            {/* Horizontal Tabs */}
            <div className="relative overflow-hidden">
              {/* Left gradient */}
              <div
                className={cn(
                  `
                    from-background pointer-events-none absolute top-0 left-0
                    z-10 h-full w-8 bg-linear-to-r to-transparent
                    transition-opacity
                  `,
                  canScrollLeft ? "opacity-100" : "opacity-0",
                )}
              />
              {/* Right gradient */}
              <div
                className={cn(
                  `
                    from-background pointer-events-none absolute top-0 right-0
                    z-10 h-full w-8 bg-linear-to-l to-transparent
                    transition-opacity
                  `,
                  canScrollRight ? "opacity-100" : "opacity-0",
                )}
              />
              <TabsList
                ref={tabsRef}
                onScroll={updateScrollState}
                className="bg-muted/50 h-auto max-w-full gap-1 overflow-x-auto"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      data-tab-id={tab.id}
                      className="shrink-0 gap-2 px-3 py-1.5"
                    >
                      <Icon className="size-4" />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
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

                <nav className="flex flex-col gap-1 p-2">
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
                            font-medium whitespace-nowrap transition-colors
                          `,
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : `
                              text-sidebar-foreground/70
                              hover:bg-sidebar-accent
                              hover:text-sidebar-accent-foreground
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

            <span className="text-base font-semibold">{activeTabConfig?.label}</span>

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

          <TabsContent value="interface"><InterfaceTab /></TabsContent>
          <TabsContent value="preferences"><PreferencesTab /></TabsContent>
          <TabsContent value="integrations"><IntegrationsTab /></TabsContent>
          <TabsContent value="models" className="flex min-h-0 flex-1 flex-col"><ModelsTab /></TabsContent>
          <TabsContent value="attachments"><AttachmentsTab /></TabsContent>
          <TabsContent value="auth"><AuthTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProfileSidebar({ onSignOut }: { onSignOut: () => void }) {
  const { data: session, isPending } = useSession();

  return (
    <aside className={`
      bg-background text-sidebar-foreground relative hidden w-80 shrink-0
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

      {/* Back to Thread */}
      <div className="p-4">
        <BackToChatButton />
      </div>

      {/* Profile Card */}
      <div className="flex flex-col items-center gap-4 px-6 py-4">
        {isPending
          ? (
              <>
                <Skeleton className="size-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </>
            )
          : (
              <>
                <UserAvatar session={session} />
                <div className="text-center">
                  <h2 className="text-lg font-semibold">
                    {session?.user?.name || "Unnamed User"}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {session?.user?.email || "No email"}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className={`
                    text-muted-foreground w-full gap-2
                    hover:bg-destructive/10 hover:text-destructive
                  `}
                  onClick={onSignOut}
                >
                  <LogOutIcon className="size-4" />
                  Sign Out
                </Button>
              </>
            )}
      </div>

      {/* Subscription Card */}
      <div className="px-4 py-2">
        <SubscriptionCard />
      </div>

      {/* Keyboard Shortcuts */}
      <div className="px-4 py-2">
        <div className="bg-card rounded-lg p-4">
          <h3 className={`
            text-muted-foreground mb-3 text-xs font-semibold tracking-wider
            uppercase
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
                        bg-background text-muted-foreground rounded px-1.5
                        py-0.5 font-mono text-xs
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
    </aside>
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
    <div className="flex items-center gap-3">
      <UserAvatar session={session} />
      <div>
        <p className="font-medium">{session?.user?.name || "Unnamed User"}</p>
        <p className="text-muted-foreground text-sm">{session?.user?.email || "No email"}</p>
      </div>
    </div>
  );
}
