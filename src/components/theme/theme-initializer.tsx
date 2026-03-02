"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import type { AccentColor, UserSettingsData } from "~/features/settings/types";

const ACCENT_CLASSES = ["accent-pink", "accent-cyan", "accent-orange", "accent-yellow", "accent-blue", "accent-gray"];
const CUSTOM_COLOR_VARS = ["--primary", "--ring", "--chart-1", "--sidebar-primary", "--sidebar-ring"];

export function applyAccentColor(color: AccentColor) {
  const html = document.documentElement;

  // Clear preset classes
  ACCENT_CLASSES.forEach(cls => html.classList.remove(cls));

  // Clear custom inline styles
  CUSTOM_COLOR_VARS.forEach(v => html.style.removeProperty(v));

  if (typeof color === "number") {
    // Custom hue - apply inline styles
    const primary = `oklch(0.72 0.19 ${color})`;
    CUSTOM_COLOR_VARS.forEach(v => html.style.setProperty(v, primary));
  }
  else if (color !== "green") {
    // Preset (non-default) - use class
    html.classList.add(`accent-${color}`);
  }
}

const FONT_SANS_CLASSES = ["font-sans-lexend", "font-sans-atkinson", "font-sans-system"];
const FONT_MONO_CLASSES = ["font-mono-atkinson-mono", "font-mono-system"];

export function applyFonts(fontSans: UserSettingsData["fontSans"], fontMono: UserSettingsData["fontMono"]) {
  const html = document.documentElement;

  FONT_SANS_CLASSES.forEach(cls => html.classList.remove(cls));
  if (fontSans !== "rethink") {
    html.classList.add(`font-sans-${fontSans}`);
  }

  FONT_MONO_CLASSES.forEach(cls => html.classList.remove(cls));
  if (fontMono !== "jetbrains") {
    html.classList.add(`font-mono-${fontMono}`);
  }

  // Persist to cookies so root layout can apply before paint on next load
  document.cookie = `font_sans=${fontSans}; path=/; max-age=31536000; SameSite=Lax`;
  document.cookie = `font_mono=${fontMono}; path=/; max-age=31536000; SameSite=Lax`;
}

type ThemeInitializerProps = {
  theme?: string;
  accentColor?: AccentColor;
  fontSans?: UserSettingsData["fontSans"];
  fontMono?: UserSettingsData["fontMono"];
};

/**
 * Applies the user's saved theme preference on app start
 * Must be a child of ThemeProvider
 * Props are passed from SSR to avoid client-side fetch
 */
export function ThemeInitializer({ theme, accentColor, fontSans, fontMono }: ThemeInitializerProps) {
  const { setTheme } = useTheme();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    if (theme) {
      setTheme(theme);
    }
    if (accentColor) {
      applyAccentColor(accentColor);
    }
    applyFonts(fontSans ?? "rethink", fontMono ?? "jetbrains");
    hasInitialized.current = true;
  }, [theme, accentColor, fontSans, fontMono, setTheme]);

  return null;
}
