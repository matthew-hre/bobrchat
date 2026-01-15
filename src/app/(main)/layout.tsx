import { Suspense } from "react";

import { ChatSidebar } from "~/components/sidebar/chat-sidebar";
import { FloatingSidebarToggle } from "~/components/sidebar/floating-sidebar-toggle";
import { SidebarProvider } from "~/components/ui/sidebar";
import { SettingsModalProvider } from "~/features/settings/components/settings-modal-provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ChatSidebar />
      <FloatingSidebarToggle />
      <main className="w-full">
        {children}
      </main>
      <Suspense fallback={null}>
        <SettingsModalProvider />
      </Suspense>
    </SidebarProvider>
  );
}
