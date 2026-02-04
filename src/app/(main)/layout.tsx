import { HydrationBoundary } from "@tanstack/react-query";
import { cookies, headers } from "next/headers";

import { ChatSidebar } from "~/components/sidebar/chat-sidebar";
import { FloatingSidebarToggle } from "~/components/sidebar/floating-sidebar-toggle";
import { ThemeInitializer } from "~/components/theme/theme-initializer";
import { SidebarProvider } from "~/components/ui/sidebar";
import { GlobalDropZoneProvider } from "~/features/attachments/components/global-drop-zone";
import { auth } from "~/features/auth/lib/auth";
import { getUserSettings } from "~/features/settings/queries";
import { prefetchThreads } from "~/lib/queries/prefetch-threads";

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const [dehydratedState, settings] = await Promise.all([
    session?.user ? prefetchThreads(session.user.id) : Promise.resolve(undefined),
    session?.user ? getUserSettings(session.user.id) : Promise.resolve(null),
  ]);

  return (
    <HydrationBoundary state={dehydratedState}>
      <GlobalDropZoneProvider>
        <SidebarProvider defaultSidebarWidth={defaultSidebarWidth}>
          {session && <ChatSidebar session={session} />}
          {session && <FloatingSidebarToggle />}
          <main className="w-full">
            {children}
          </main>
          <ThemeInitializer
            theme={settings?.theme}
            accentColor={settings?.accentColor}
          />
        </SidebarProvider>
      </GlobalDropZoneProvider>
    </HydrationBoundary>
  );
}
