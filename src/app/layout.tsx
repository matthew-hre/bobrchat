import type { Metadata, Viewport } from "next";

import { JetBrains_Mono, Rethink_Sans } from "next/font/google";
import { Suspense } from "react";

import "./globals.css";
import { ChatSidebar } from "~/components/sidebar/chat-sidebar";
import { FloatingSidebarToggle } from "~/components/sidebar/floating-sidebar-toggle";
import { ThemeInitializer } from "~/components/theme/theme-initializer";
import { ThemeProvider } from "~/components/theme/theme-provider";
import { SidebarProvider } from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/sonner";
import { SettingsModalProvider } from "~/features/settings/components/settings-modal-provider";
import { QueryProvider } from "~/lib/queries/query-provider";

const rethinkSans = Rethink_Sans({ subsets: ["latin"], variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BobrChat",
  description: "Chat interface powered by Vercel AI SDK V6 and OpenRouter",
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "oklch(0.98 0.001 260)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(0.16 0.01 260)" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <QueryProvider>
            <Toaster position="top-right" />
            <ThemeInitializer />
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
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
