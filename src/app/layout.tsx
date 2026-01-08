import type { Metadata } from "next";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { JetBrains_Mono, Rethink_Sans } from "next/font/google";
import { headers } from "next/headers";

import "./globals.css";
import { ChatSidebar } from "~/components/sidebar/chat-sidebar";
import { FloatingSidebarToggle } from "~/components/sidebar/floating-sidebar-toggle";
import { ThemeInitializer } from "~/components/theme/theme-initializer";
import { ThemeProvider } from "~/components/theme/theme-provider";
import { SidebarProvider } from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/sonner";
import { auth } from "~/lib/auth";
import { THREADS_KEY, USER_SETTINGS_KEY } from "~/lib/queries/query-keys";
import { QueryProvider } from "~/lib/queries/query-provider";
import { syncUserSettings } from "~/server/actions/settings";
import { getThreadsByUserId } from "~/server/db/queries/chat";

const rethinkSans = Rethink_Sans({ subsets: ["latin"], variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BobrChat",
  description: "Chat interface powered by Vercel AI SDK V6 and OpenRouter",
  icons: {
    icon: "https://fav.farm/🦫",
  },
};

export default async function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  const queryClient = new QueryClient();

  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    await Promise.all([
      queryClient.prefetchInfiniteQuery({
        queryKey: THREADS_KEY,
        queryFn: () => getThreadsByUserId(session.user.id),
        initialPageParam: undefined as string | undefined,
      }),
      queryClient.prefetchQuery({
        queryKey: USER_SETTINGS_KEY,
        queryFn: () => syncUserSettings(),
      }),
    ]);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`
          ${rethinkSans.variable}
          ${jetbrainsMono.variable}
          min-h-screen w-full antialiased
        `}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider dehydratedState={dehydratedState}>
            <Toaster position="top-right" />
            <ThemeInitializer />
            <SidebarProvider>
              <ChatSidebar />
              <FloatingSidebarToggle />
              <main className="w-full">
                {children}
              </main>
              {modal}
            </SidebarProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
