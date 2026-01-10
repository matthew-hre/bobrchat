import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getClientKey } from "~/lib/api-keys/client";

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
  openrouterKey: string | null;
  parallelKey: string | null;
  loadApiKeysFromStorage: () => void;

  // TODO: Properly type this
  // Pending message for new thread creation

  pendingMessage: any | null;

  setPendingMessage: (message: any | null) => void;

  consumePendingMessage: () => any | null;

  // Streaming indicator (not persisted)
  streamingThreadId: string | null;
  setStreamingThreadId: (threadId: string | null) => void;

  // Messages stopped by the user (not persisted)
  stoppedAssistantMessageInfoById: Record<string, { modelId: string | null }>;
  markAssistantMessageStopped: (messageId: string, modelId: string | null) => void;
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
      openrouterKey: null,
      parallelKey: null,
      loadApiKeysFromStorage: () => {
        set({
          openrouterKey: getClientKey("openrouter"),
          parallelKey: getClientKey("parallel"),
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

      streamingThreadId: null,
      setStreamingThreadId: threadId => set({ streamingThreadId: threadId }),

      stoppedAssistantMessageInfoById: {},
      markAssistantMessageStopped: (messageId, modelId) => set(state => ({
        stoppedAssistantMessageInfoById: {
          ...state.stoppedAssistantMessageInfoById,
          [messageId]: { modelId },
        },
      })),
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
