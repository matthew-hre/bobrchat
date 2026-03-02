import { JetBrains_Mono, Lexend, Rethink_Sans } from "next/font/google";
import localFont from "next/font/local";

export const rethinkSans = Rethink_Sans({ subsets: ["latin"], variable: "--font-rethink" });

export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

export const atkinsonHyperlegible = localFont({
  src: [
    { path: "../fonts/atkinson-hyperlegible-400.woff2", weight: "400" },
    { path: "../fonts/atkinson-hyperlegible-700.woff2", weight: "700" },
  ],
  variable: "--font-atkinson",
});

export const atkinsonHyperlegibleMono = localFont({
  src: "../fonts/atkinson-hyperlegible-mono.woff2",
  variable: "--font-atkinson-mono",
});
