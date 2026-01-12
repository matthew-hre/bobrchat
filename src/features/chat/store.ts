import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getClientKey, removeClientKey, setClientKey } from "~/lib/api-keys/client";

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

  reasoningEnabled: boolean;
  setReasoningEnabled: (enabled: boolean) => void;

  // Browser API keys (loaded from localStorage once, not persisted by zustand)
  openrouterKey: string | null;
  parallelKey: string | null;
  loadApiKeysFromStorage: () => void;

  setOpenRouterKey: (key: string) => void;
  setParallelKey: (key: string) => void;

  removeOpenRouterKey: () => void;
  removeParallelKey: () => void;

  // Streaming indicator (not persisted)
  streamingThreadId: string | null;
  setStreamingThreadId: (threadId: string | null) => void;

  // Messages stopped by the user (not persisted)
  stoppedAssistantMessageInfoById: Record<string, { modelId: string | null }>;
  markAssistantMessageStopped: (messageId: string, modelId: string | null) => void;
};

export const useChatUIStore = create<ChatUIStore>()(
  persist(
    (set, _get) => ({
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

      reasoningEnabled: false,
      setReasoningEnabled: enabled => set({ reasoningEnabled: enabled }),

      // Browser API keys (not persisted by zustand, loaded manually from localStorage)
      openrouterKey: null,
      parallelKey: null,
      loadApiKeysFromStorage: () => {
        set({
          openrouterKey: getClientKey("openrouter"),
          parallelKey: getClientKey("parallel"),
        });
      },

      setOpenRouterKey: (key: string) => {
        setClientKey("openrouter", key);
        set({ openrouterKey: key });
      },

      removeOpenRouterKey: () => {
        removeClientKey("openrouter");
        set({ openrouterKey: null });
      },

      setParallelKey: (key: string) => {
        setClientKey("parallel", key);
        set({ parallelKey: key });
      },

      removeParallelKey: () => {
        removeClientKey("parallel");
        set({ parallelKey: null });
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
