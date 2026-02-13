import type { Metadata, Viewport } from "next";

import { Analytics } from "@vercel/analytics/next";
import { JetBrains_Mono, Rethink_Sans } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "~/components/theme/theme-provider";
import { Toaster } from "~/components/ui/sonner";
import { PreviousRouteProvider } from "~/features/settings/previous-route-context";
import { QueryProvider } from "~/lib/queries/query-provider";

const rethinkSans = Rethink_Sans({ subsets: ["latin"], variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BobrChat - Fast, Minimal AI Chat Interface",
    template: "%s | BobrChat",
  },
  description:
    "BobrChat is a fast, minimal AI chat interface with support for multiple models. Experience seamless threads with Claude, GPT, and more.",
  keywords: ["AI chat", "chatbot", "Claude", "GPT", "AI assistant", "bobrchat", "chat interface"],
  authors: [{ name: "BobrChat" }],
  creator: "BobrChat",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BobrChat",
  },
  metadataBase: new URL("https://bobrchat.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bobrchat.com",
    siteName: "BobrChat",
    title: "BobrChat - Fast, Minimal AI Chat Interface",
    description:
      "A fast, minimal AI chat interface with support for multiple models. Experience seamless threads with Claude, GPT, and more.",
    images: [{ url: "https://og.bobrchat.com/", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BobrChat - Fast, Minimal AI Chat Interface",
    description:
      "A fast, minimal AI chat interface with support for multiple models. Experience seamless threads with Claude, GPT, and more.",
    images: ["https://og.bobrchat.com/"],
  },
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
        <Analytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PreviousRouteProvider>
            <QueryProvider>
              <Toaster position="top-right" />
              {children}
            </QueryProvider>
          </PreviousRouteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
