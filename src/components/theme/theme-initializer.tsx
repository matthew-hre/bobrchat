"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/**
 * Loads and applies the user's saved theme preference on app start
 * Must be a child of ThemeProvider
 */
export function ThemeInitializer() {
  const { setTheme } = useTheme();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only fetch settings on initial mount to avoid overwriting user changes
    if (hasInitialized.current) {
      return;
    }

    const initializeTheme = async () => {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok)
          return;

        const settings = (await response.json()) as { theme?: string; boringMode?: boolean };
        if (settings.theme) {
          setTheme(settings.theme);
        }
        if (settings.boringMode) {
          document.documentElement.classList.add("boring");
        }
        hasInitialized.current = true;
      }
      catch (error) {
        console.error("Failed to initialize theme:", error);
      }
    };

    initializeTheme();
  }, []);

  return null;
}
