import type { Metadata } from "next";

import { JetBrains_Mono, Rethink_Sans } from "next/font/google";

import "./globals.css";
import { ChatSidebar } from "~/components/sidebar/chat-sidebar";
import { FloatingSidebarToggle } from "~/components/sidebar/floating-sidebar-toggle";
import { ThemeInitializer } from "~/components/theme/theme-initializer";
import { ThemeProvider } from "~/components/theme/theme-provider";
import { SidebarProvider } from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/sonner";

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

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
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
        </ThemeProvider>
      </body>
    </html>
  );
}
