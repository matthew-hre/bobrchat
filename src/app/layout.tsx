import type { Metadata, Viewport } from "next";

import { Analytics } from "@vercel/analytics/next";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";

import "./globals.css";

import { JetBrains_Mono, Rethink_Sans } from "next/font/google";

import { ThemeProvider } from "~/components/theme/theme-provider";
import { Toaster } from "~/components/ui/sonner";
import { PreviousRouteProvider } from "~/features/settings/previous-route-context";
import { QueryProvider } from "~/lib/queries/query-provider";

const rethinkSans = Rethink_Sans({ subsets: ["latin"], variable: "--font-rethink" });

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
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
    <html lang="en" suppressHydrationWarning className={`${rethinkSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var c=document.cookie.split(";");var fs,fm;c.forEach(function(s){s=s.trim();if(s.startsWith("font_sans="))fs=s.substring(10);if(s.startsWith("font_mono="))fm=s.substring(10)});var h=document.documentElement.style;if(fs==="system")h.setProperty("--font-rethink","ui-sans-serif,system-ui,-apple-system,sans-serif");if(fm==="system")h.setProperty("--font-jetbrains","ui-monospace,SFMono-Regular,Menlo,Consolas,monospace")})()`,
          }}
        />
      </head>
      <body className="min-h-screen w-full font-sans antialiased">
        <Analytics />
        <AuthKitProvider>
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
        </AuthKitProvider>
      </body>
    </html>
  );
}
