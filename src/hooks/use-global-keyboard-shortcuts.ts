"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSidebar } from "~/components/ui/sidebar";
import { useChatUIStore } from "~/features/chat/store";

export type GlobalKeyboardShortcutsRefs = {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
};

export function useGlobalKeyboardShortcuts(refs: GlobalKeyboardShortcutsRefs) {
  const router = useRouter();
  const setModelSelectorOpen = useChatUIStore(s => s.setModelSelectorOpen);
  const modelSelectorOverride = useChatUIStore(s => s.modelSelectorOverride);
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputFocused = target.tagName === "INPUT"
        || target.tagName === "TEXTAREA"
        || target.isContentEditable;

      if (event.key === "/" && !isInputFocused) {
        event.preventDefault();
        refs.searchInputRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && isInputFocused) {
        (target as HTMLInputElement | HTMLTextAreaElement).blur();
        return;
      }

      if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      if (event.key === "m" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (modelSelectorOverride) {
          modelSelectorOverride();
        }
        else {
          setModelSelectorOpen(true);
        }
        return;
      }

      if (event.key === "," && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        router.push("/settings");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [refs.searchInputRef, router, setModelSelectorOpen, modelSelectorOverride, toggleSidebar]);
}
