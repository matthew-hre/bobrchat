import { headers } from "next/headers";
import { Suspense } from "react";

import { ChatSidebar } from "~/components/sidebar/chat-sidebar";
import { FloatingSidebarToggle } from "~/components/sidebar/floating-sidebar-toggle";
import { SidebarProvider } from "~/components/ui/sidebar";
import { GlobalDropZoneProvider } from "~/features/attachments/components/global-drop-zone";
import { auth } from "~/features/auth/lib/auth";
import { SettingsModalProvider } from "~/features/settings/components/settings-modal-provider";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <GlobalDropZoneProvider>
      <SidebarProvider>
        {session && <ChatSidebar />}
        {session && <FloatingSidebarToggle />}
        <main className="w-full">
          {children}
        </main>
        <Suspense fallback={null}>
          <SettingsModalProvider />
        </Suspense>
      </SidebarProvider>
    </GlobalDropZoneProvider>
  );
}
