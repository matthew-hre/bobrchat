import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PendingFile } from "~/features/chat/components/messages/file-preview";

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

  reasoningLevel: string;
  setReasoningLevel: (level: string) => void;

  // Model selector popover
  modelSelectorOpen: boolean;
  setModelSelectorOpen: (open: boolean) => void;

  // Override for model selector keybind (e.g., inline editor registers when mounted)
  modelSelectorOverride: (() => void) | null;
  setModelSelectorOverride: (fn: (() => void) | null) => void;

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

  // Raw markdown toggle (not persisted)
  rawMessageIds: Set<string>;
  toggleRawMessage: (messageId: string) => void;

  // Pending file attachments (not persisted — blob URLs are ephemeral)
  pendingFiles: PendingFile[];
  setPendingFiles: (next: PendingFile[] | ((prev: PendingFile[]) => PendingFile[])) => void;
  clearPendingFiles: () => void;
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

      reasoningLevel: "none",
      setReasoningLevel: level => set({ reasoningLevel: level }),

      // Model selector popover
      modelSelectorOpen: false,
      setModelSelectorOpen: open => set({ modelSelectorOpen: open }),

      modelSelectorOverride: null,
      setModelSelectorOverride: fn => set({ modelSelectorOverride: fn }),

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

      rawMessageIds: new Set(),
      toggleRawMessage: messageId => set((state) => {
        const next = new Set(state.rawMessageIds);
        if (next.has(messageId)) {
          next.delete(messageId);
        }
        else {
          next.add(messageId);
        }
        return { rawMessageIds: next };
      }),

      pendingFiles: [],
      setPendingFiles: next =>
        set(state => ({
          pendingFiles: typeof next === "function" ? next(state.pendingFiles) : next,
        })),
      clearPendingFiles: () => {
        for (const f of get().pendingFiles) {
          if (f.url?.startsWith("blob:"))
            URL.revokeObjectURL(f.url);
        }
        set({ pendingFiles: [] });
      },
    }),
    {
      name: "bobrchat-ui",
      partialize: state => ({
        selectedModelId: state.selectedModelId,
        searchEnabled: state.searchEnabled,
        reasoningLevel: state.reasoningLevel,
      }),
    },
  ),
);
