import { HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";

import { KeyboardShortcutsProvider } from "~/components/keyboard-shortcuts-provider";
import { ChatSidebar } from "~/components/sidebar/chat-sidebar";
import { FloatingSidebarToggle } from "~/components/sidebar/floating-sidebar-toggle";
import { ThemeInitializer } from "~/components/theme/theme-initializer";
import { SidebarProvider } from "~/components/ui/sidebar";
import { GlobalDropZoneProvider } from "~/features/attachments/components/global-drop-zone";
import { getSession } from "~/features/auth/lib/session";
import { UserSettingsProvider } from "~/features/settings/settings-provider";
import { prefetchUserData } from "~/lib/queries/prefetch-user-data";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarWidthValue = cookieStore.get("sidebar_width")?.value;
  const parsedSidebarWidth = sidebarWidthValue
    ? Number.parseFloat(sidebarWidthValue)
    : undefined;
  const defaultSidebarWidth = Number.isFinite(parsedSidebarWidth)
    ? parsedSidebarWidth
    : undefined;
  const session = await getSession();

  const { dehydratedState, settings } = session?.user
    ? await prefetchUserData(session.user.id)
    : { dehydratedState: undefined, settings: null };

  return (
    <HydrationBoundary state={dehydratedState}>
      <GlobalDropZoneProvider>
        <SidebarProvider defaultSidebarWidth={defaultSidebarWidth}>
          <KeyboardShortcutsProvider>
            {session && <ChatSidebar session={session} />}
            {session && <FloatingSidebarToggle />}
            <UserSettingsProvider settings={settings}>
              <main className="w-full">
                {children}
              </main>
            </UserSettingsProvider>
            <ThemeInitializer
              theme={settings?.theme}
              accentColor={settings?.accentColor}
            />
          </KeyboardShortcutsProvider>
        </SidebarProvider>
      </GlobalDropZoneProvider>
    </HydrationBoundary>
  );
}
