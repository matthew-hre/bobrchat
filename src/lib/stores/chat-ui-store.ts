import { create } from "zustand";
import { persist } from "zustand/middleware";

type ChatUIStore = {
  // Chat input
  input: string;
  setInput: (value: string) => void;
  clearInput: () => void;

  // Model selection
  selectedModelId: string | null;
  setSelectedModelId: (id: string) => void;

  // Search toggle
  searchEnabled: boolean;
  setSearchEnabled: (enabled: boolean) => void;

  // Browser API keys (loaded from localStorage once, not persisted by zustand)
  browserApiKey: string | null;
  parallelApiKey: string | null;
  loadApiKeysFromStorage: () => void;

  // TODO: Properly type this
  // Pending message for new thread creation

  pendingMessage: any | null;

  setPendingMessage: (message: any | null) => void;

  consumePendingMessage: () => any | null;
};

export const useChatUIStore = create<ChatUIStore>()(
  persist(
    (set, get) => ({
      // Chat input
      input: "",
      setInput: value => set({ input: value }),
      clearInput: () => set({ input: "" }),

      // Model selection
      selectedModelId: null,
      setSelectedModelId: id => set({ selectedModelId: id }),

      // Search toggle
      searchEnabled: false,
      setSearchEnabled: enabled => set({ searchEnabled: enabled }),

      // Browser API keys (not persisted by zustand, loaded manually from localStorage)
      browserApiKey: null,
      parallelApiKey: null,
      loadApiKeysFromStorage: () => {
        if (typeof window === "undefined")
          return;
        set({
          browserApiKey: localStorage.getItem("openrouter_api_key"),
          parallelApiKey: localStorage.getItem("parallel_api_key"),
        });
      },

      // Pending message
      pendingMessage: null,
      setPendingMessage: message => set({ pendingMessage: message }),
      consumePendingMessage: () => {
        const message = get().pendingMessage;
        set({ pendingMessage: null });
        return message;
      },
    }),
    {
      name: "bobrchat-ui",
      partialize: state => ({
        selectedModelId: state.selectedModelId,
        searchEnabled: state.searchEnabled,
      }),
    },
  ),
);
