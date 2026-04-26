import type { Metadata, Viewport } from "next";

import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";

import "./globals.css";

import { ThemeProvider } from "~/components/theme/theme-provider";
import { Toaster } from "~/components/ui/sonner";
import { PreviousRouteProvider } from "~/features/settings/previous-route-context";
import { atkinsonHyperlegible, atkinsonHyperlegibleMono, jetbrainsMono, lexend, rethinkSans } from "~/lib/fonts";
import { QueryProvider } from "~/lib/queries/query-provider";

export const metadata: Metadata = {
  title: {
    default: "BobrChat - Fast, Minimal AI Chat Interface",
    template: "%s | BobrChat",
  },
  description:
    "BobrChat is a fast, minimal AI chat interface with support for multiple models. Bring your own API key and pay only what you use. Chat with Claude, GPT, Gemini, and more.",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  keywords: ["AI chat", "chatbot", "Claude", "GPT", "Gemini", "AI assistant", "bobrchat", "chat interface", "bring your own key", "OpenRouter"],
  authors: [{ name: "BobrChat" }],
  creator: "BobrChat",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BobrChat",
  },
  metadataBase: new URL("https://bobrchat.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bobrchat.com",
    siteName: "BobrChat",
    title: "BobrChat - Fast, Minimal AI Chat Interface",
    description:
      "Bring your own API key and pay only what you use. Chat with Claude, GPT, Gemini, and more in a clean, minimal interface.",
    images: [{ url: "https://og.bobrchat.com/", width: 1200, height: 630, alt: "BobrChat - Fast, Minimal AI Chat Interface" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BobrChat - Fast, Minimal AI Chat Interface",
    description:
      "Bring your own API key and pay only what you use. Chat with Claude, GPT, Gemini, and more in a clean, minimal interface.",
    images: [{ url: "https://og.bobrchat.com/", alt: "BobrChat - Fast, Minimal AI Chat Interface" }],
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`
        ${rethinkSans.variable}
        ${jetbrainsMono.variable}
        ${lexend.variable}
        ${atkinsonHyperlegible.variable}
        ${atkinsonHyperlegibleMono.variable}
      `}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var c=document.cookie.split(";");var fs,fm;c.forEach(function(s){s=s.trim();if(s.startsWith("font_sans="))fs=s.substring(10);if(s.startsWith("font_mono="))fm=s.substring(10)});var h=document.documentElement;if(fs&&fs!=="rethink")h.classList.add("font-sans-"+fs);if(fm&&fm!=="jetbrains")h.classList.add("font-mono-"+fm)})()`,
          }}
        />
      </head>
      <body className="min-h-screen w-full font-sans antialiased">
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
