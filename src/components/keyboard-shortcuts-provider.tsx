"use client";

import { createContext, use, useRef } from "react";

import { useGlobalKeyboardShortcuts } from "~/hooks/use-global-keyboard-shortcuts";

type KeyboardShortcutsContextValue = {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useGlobalKeyboardShortcuts({ searchInputRef });

  return (
    <KeyboardShortcutsContext value={{ searchInputRef }}>
      {children}
    </KeyboardShortcutsContext>
  );
}

export function useKeyboardShortcutsContext() {
  const context = use(KeyboardShortcutsContext);
  if (!context) {
    throw new Error("useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider");
  }
  return context;
}
