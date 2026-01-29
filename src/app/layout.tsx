import type { Metadata, Viewport } from "next";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { JetBrains_Mono, Rethink_Sans } from "next/font/google";
import "katex/dist/katex.min.css";

import "./globals.css";

import { ThemeInitializer } from "~/components/theme/theme-initializer";
import { ThemeProvider } from "~/components/theme/theme-provider";
import { Toaster } from "~/components/ui/sonner";
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
    "BobrChat is a fast, minimal AI chat interface with support for multiple models. Experience seamless conversations with Claude, GPT, and more.",
  keywords: ["AI chat", "chatbot", "Claude", "GPT", "AI assistant", "bobrchat", "chat interface"],
  authors: [{ name: "BobrChat" }],
  creator: "BobrChat",
  metadataBase: new URL("https://bobrchat.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bobrchat.com",
    siteName: "BobrChat",
    title: "BobrChat - Fast, Minimal AI Chat Interface",
    description:
      "A fast, minimal AI chat interface with support for multiple models. Experience seamless conversations with Claude, GPT, and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BobrChat - Fast, Minimal AI Chat Interface",
    description:
      "A fast, minimal AI chat interface with support for multiple models. Experience seamless conversations with Claude, GPT, and more.",
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
        <SpeedInsights />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <Toaster position="top-right" />
            <ThemeInitializer />
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
