# State Management Refactor Plan

## Progress Summary

**Status: COMPLETE ✅**

### Completed
- ✅ React Query provider created and wired into layout
- ✅ Zustand store created with input, model selection, search toggle, API keys, pending message
- ✅ Query hooks created: `useUserSettings`, `useThreads`, `useModels`, `useFavoriteModels`
- ✅ `/api/threads` route created for client-side thread fetching
- ✅ Core pages updated: `page.tsx`, `chat-thread.tsx`, `chat-input.tsx`
- ✅ Removed `UserSettingsProvider` and `ModelProvider` from layout
- ✅ Converted `ChatSidebar` to client component using `useThreads()`
- ✅ Updated settings components (`preferences-tab.tsx`, `integrations-tab.tsx`, `models-tab.tsx`) to use React Query mutations
- ✅ Deleted deprecated files (`user-settings-provider.tsx`, `model-context.tsx`, `use-chat-input-features.ts`, `model-cache.ts`)
- ✅ Removed `revalidatePath` calls from server actions
- ✅ Build passes

### Remaining
- Manual testing

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STATE MANAGEMENT                                 │
├─────────────────────────────────┬───────────────────────────────────────┤
│         SERVER DATA             │           CLIENT/UI DATA              │
│        (React Query)            │            (Zustand)                  │
├─────────────────────────────────┼───────────────────────────────────────┤
│ • User settings                 │ • Selected model ID                   │
│ • Thread list                   │ • Chat input draft                    │
│ • Available models              │ • Search toggle                       │
│ • Thread messages (initial)     │ • Browser API keys (loaded once)      │
│                                 │ • Pending message (for new threads)   │
├─────────────────────────────────┴───────────────────────────────────────┤
│                         KEEP AS-IS                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ • SidebarProvider (shadcn/ui) - sidebar open/close state                │
│ • ThemeProvider (next-themes) - theme state                             │
│ • useChat (@ai-sdk/react) - streaming chat state per thread             │
│ • Server actions - all mutations (chat.ts, settings.ts)                 │
│ • /api/chat route - streaming endpoint                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## New File Structure

```
src/
├── lib/
│   ├── stores/
│   │   └── chat-ui-store.ts      # Zustand store for UI state
│   └── queries/
│       ├── query-provider.tsx    # QueryClientProvider wrapper
│       ├── use-threads.ts        # Thread list query
│       ├── use-user-settings.ts  # User settings query + mutations
│       └── use-models.ts         # Models list query
```

---

## Ordered Steps

### Step 1: Install Dependencies

```bash
bun add @tanstack/react-query zustand
```

No dev dependencies needed.

---

### Step 2: Create React Query Provider

**File:** `src/lib/queries/query-provider.tsx`

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Update:** `src/app/layout.tsx` - wrap with `QueryProvider` (inside ThemeProvider, outside other providers)

---

### Step 3: Create Zustand Store

**File:** `src/lib/stores/chat-ui-store.ts`

```tsx
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

  // Browser API keys (loaded from localStorage once)
  browserApiKey: string | null;
  parallelApiKey: string | null;
  loadApiKeysFromStorage: () => void;

  // Pending message for new thread creation
  pendingMessage: object | null;
  setPendingMessage: (message: object | null) => void;
  consumePendingMessage: () => object | null;
};

export const useChatUIStore = create<ChatUIStore>()(
  persist(
    (set, get) => ({
      // Chat input
      input: "",
      setInput: (value) => set({ input: value }),
      clearInput: () => set({ input: "" }),

      // Model selection
      selectedModelId: null,
      setSelectedModelId: (id) => set({ selectedModelId: id }),

      // Search toggle
      searchEnabled: false,
      setSearchEnabled: (enabled) => set({ searchEnabled: enabled }),

      // Browser API keys (not persisted by zustand, loaded manually)
      browserApiKey: null,
      parallelApiKey: null,
      loadApiKeysFromStorage: () => {
        if (typeof window === "undefined") return;
        set({
          browserApiKey: localStorage.getItem("openrouter_api_key"),
          parallelApiKey: localStorage.getItem("parallel_api_key"),
        });
      },

      // Pending message
      pendingMessage: null,
      setPendingMessage: (message) => set({ pendingMessage: message }),
      consumePendingMessage: () => {
        const message = get().pendingMessage;
        set({ pendingMessage: null });
        return message;
      },
    }),
    {
      name: "bobrchat-ui",
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        searchEnabled: state.searchEnabled,
        // Don't persist: input, pendingMessage, API keys
      }),
    }
  )
);
```

---

### Step 4: Create React Query Hooks

#### 4a. User Settings Query

**File:** `src/lib/queries/use-user-settings.ts`

```tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiKeyProvider, UserSettingsData } from "~/lib/db/schema/settings";
import type { PreferencesUpdate } from "~/lib/schemas/settings";

import {
  deleteApiKey,
  syncUserSettings,
  updateApiKey,
  updateFavoriteModels,
  updatePreferences,
} from "~/server/actions/settings";

export const USER_SETTINGS_KEY = ["user-settings"] as const;

export function useUserSettings() {
  return useQuery({
    queryKey: USER_SETTINGS_KEY,
    queryFn: () => syncUserSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: PreferencesUpdate) => updatePreferences(updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: USER_SETTINGS_KEY });
      const previous = queryClient.getQueryData<UserSettingsData>(USER_SETTINGS_KEY);
      queryClient.setQueryData<UserSettingsData>(USER_SETTINGS_KEY, (old) =>
        old ? { ...old, ...updates } : old
      );
      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(USER_SETTINGS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
    },
  });
}

export function useUpdateFavoriteModels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (favoriteModels: string[]) => updateFavoriteModels({ favoriteModels }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
    },
  });
}

export function useSetApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      provider,
      apiKey,
      storeServerSide,
    }: {
      provider: ApiKeyProvider;
      apiKey: string;
      storeServerSide?: boolean;
    }) => updateApiKey(provider, apiKey, storeServerSide),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
    },
  });
}

export function useRemoveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: ApiKeyProvider) => deleteApiKey(provider),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
    },
  });
}
```

#### 4b. Thread List Query

**File:** `src/lib/queries/use-threads.ts`

```tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createNewThread, deleteThread, renameThread } from "~/server/actions/chat";
import { groupThreadsByDate } from "~/lib/utils/thread-grouper";

export const THREADS_KEY = ["threads"] as const;

// Server action to fetch threads (create this)
async function fetchThreads() {
  const response = await fetch("/api/threads");
  if (!response.ok) throw new Error("Failed to fetch threads");
  return response.json();
}

export function useThreads() {
  return useQuery({
    queryKey: THREADS_KEY,
    queryFn: fetchThreads,
    staleTime: 30 * 1000, // 30 seconds
    select: (threads) => groupThreadsByDate(threads),
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (defaultName?: string) => createNewThread(defaultName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => deleteThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useRenameThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, newTitle }: { threadId: string; newTitle: string }) =>
      renameThread(threadId, newTitle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}
```

**New API route needed:** `src/app/api/threads/route.ts`

```tsx
import { headers } from "next/headers";

import { auth } from "~/lib/auth";
import { getThreadsByUserId } from "~/server/db/queries/chat";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const threads = await getThreadsByUserId(session.user.id);
  return Response.json(threads);
}
```

#### 4c. Models Query

**File:** `src/lib/queries/use-models.ts`

```tsx
"use client";

import type { Model } from "@openrouter/sdk/models";

import { useQuery } from "@tanstack/react-query";

import { fetchOpenRouterModels } from "~/server/actions/settings";
import { useUserSettings } from "./use-user-settings";

export const MODELS_KEY = ["models"] as const;

export function useModels() {
  const { data: settings } = useUserSettings();

  const hasApiKey =
    settings?.apiKeyStorage?.openrouter === "client" ||
    settings?.apiKeyStorage?.openrouter === "server";

  return useQuery({
    queryKey: MODELS_KEY,
    queryFn: async () => {
      let apiKey: string | undefined;
      if (settings?.apiKeyStorage?.openrouter === "client") {
        apiKey = localStorage.getItem("openrouter_api_key") ?? undefined;
      }
      return fetchOpenRouterModels(apiKey);
    },
    enabled: hasApiKey,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useFavoriteModels() {
  const { data: allModels } = useModels();
  const { data: settings } = useUserSettings();

  if (!allModels || !settings?.favoriteModels) {
    return [];
  }

  return settings.favoriteModels
    .map((modelId) => allModels.find((m: Model) => m.id === modelId))
    .filter((m): m is Model => m !== undefined);
}
```

---

### Step 5: Update Root Layout

**File:** `src/app/layout.tsx`

Remove `UserSettingsProvider` and `ModelProvider`, add `QueryProvider`:

```tsx
import { QueryProvider } from "~/lib/queries/query-provider";
// ... other imports

export default function RootLayout({ children, modal }: ...) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body ...>
        <ThemeProvider ...>
          <QueryProvider>
            <Toaster position="top-right" />
            <ThemeInitializer />
            <SidebarProvider>
              <ChatSidebar />
              <FloatingSidebarToggle />
              <main className="w-full">{children}</main>
              {modal}
            </SidebarProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

### Step 6: Update ChatSidebar to Client Component

**File:** `src/components/sidebar/chat-sidebar.tsx`

Convert from RSC to client component using `useThreads()`:

```tsx
"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { useThreads } from "~/lib/queries/use-threads";
import { Sidebar, SidebarContent, ... } from "~/components/ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import { ThreadList } from "./thread-list";
import { UserProfileCard } from "./user-profile-card";

export function ChatSidebar() {
  const { data: groupedThreads, isLoading } = useThreads();

  return (
    <Sidebar collapsible="offcanvas">
      {/* ... header ... */}
      <SidebarContent>
        <SidebarGroup>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : groupedThreads ? (
            <ThreadList groupedThreads={groupedThreads} />
          ) : null}
        </SidebarGroup>
      </SidebarContent>
      {/* ... footer ... */}
    </Sidebar>
  );
}
```

---

### Step 7: Update Chat Components to Use Zustand

#### 7a. Home Page

**File:** `src/app/page.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ChatView } from "~/components/chat/chat-view";
import { useUserSettings } from "~/lib/queries/use-user-settings";
import { useChatUIStore } from "~/lib/stores/chat-ui-store";
import { useCreateThread } from "~/lib/queries/use-threads";

export default function HomePage() {
  const router = useRouter();
  const { data: settings, isLoading } = useUserSettings();
  const { input, setInput, searchEnabled, setSearchEnabled, setPendingMessage } = useChatUIStore();
  const createThread = useCreateThread();

  const handleSendMessage = async (messageParts: object) => {
    try {
      const threadId = await createThread.mutateAsync(settings?.defaultThreadName);
      setPendingMessage(messageParts);
      router.push(`/chat/${threadId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create thread.";
      toast.error(message);
    }
  };

  return (
    <ChatView
      messages={[]}
      input={input}
      setInput={setInput}
      sendMessage={handleSendMessage}
      isLoading={createThread.isPending}
      searchEnabled={searchEnabled}
      onSearchChange={setSearchEnabled}
      landingPageContent={isLoading ? undefined : settings?.landingPageContent ?? "suggestions"}
      showLandingPage={!input.trim()}
    />
  );
}
```

#### 7b. Chat Thread

**File:** `src/app/chat/[id]/chat-thread.tsx`

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { use, useEffect } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatView } from "~/components/chat/chat-view";
import { useChatUIStore } from "~/lib/stores/chat-ui-store";

type ChatThreadProps = {
  params: Promise<{ id: string }>;
  initialMessages: ChatUIMessage[];
  hasApiKey: boolean;
};

export default function ChatThread({ params, initialMessages, hasApiKey }: ChatThreadProps) {
  const { id } = use(params);
  const {
    input,
    setInput,
    clearInput,
    selectedModelId,
    searchEnabled,
    setSearchEnabled,
    browserApiKey,
    parallelApiKey,
    loadApiKeysFromStorage,
    consumePendingMessage,
  } = useChatUIStore();

  // Load API keys from localStorage on mount
  useEffect(() => {
    loadApiKeysFromStorage();
  }, [loadApiKeysFromStorage]);

  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    id,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: allMessages }) => {
        // Zustand state is always current, no refs needed
        const state = useChatUIStore.getState();
        return {
          body: {
            messages: allMessages,
            threadId: id,
            searchEnabled: state.searchEnabled,
            ...(state.browserApiKey && { browserApiKey: state.browserApiKey }),
            ...(state.parallelApiKey && { parallelBrowserApiKey: state.parallelApiKey }),
            ...(state.selectedModelId && { modelId: state.selectedModelId }),
          },
        };
      },
    }),
    messages: initialMessages,
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  // Handle pending message from homepage
  useEffect(() => {
    const pending = consumePendingMessage();
    if (pending) {
      sendMessage(pending);
      clearInput();
    }
  }, [consumePendingMessage, sendMessage, clearInput]);

  return (
    <ChatView
      messages={messages}
      input={input}
      setInput={setInput}
      sendMessage={sendMessage}
      isLoading={status === "submitted" || status === "streaming"}
      searchEnabled={searchEnabled}
      onSearchChange={setSearchEnabled}
      hasApiKey={hasApiKey}
    />
  );
}
```

---

### Step 8: Update Model Selector

**File:** `src/components/chat/model-selector.tsx`

Update to use `useFavoriteModels()` and Zustand store instead of `useModelContext()`.

**File:** `src/components/chat/chat-input.tsx`

```tsx
import { useFavoriteModels, useModels } from "~/lib/queries/use-models";
import { useChatUIStore } from "~/lib/stores/chat-ui-store";

export function ChatInput({ ... }) {
  const favoriteModels = useFavoriteModels();
  const { isLoading } = useModels();
  const { selectedModelId, setSelectedModelId } = useChatUIStore();

  // ... rest of component
}
```

---

### Step 9: Update Settings Components

Update all settings components to use the new React Query hooks:

- `useUserSettings()` instead of `useUserSettingsContext()`
- `useUpdatePreferences()` instead of `updateSetting()`
- `useSetApiKey()` instead of `setApiKey()`
- `useRemoveApiKey()` instead of `removeApiKey()`
- `useUpdateFavoriteModels()` instead of `updateFavoriteModels()`

---

### Step 10: Delete Deprecated Files

After all updates are complete and tested:

1. `src/components/settings/user-settings-provider.tsx` - replaced by React Query
2. `src/components/chat/model-context.tsx` - replaced by React Query + Zustand
3. `src/hooks/use-chat-input-features.ts` - absorbed into Zustand store
4. `src/lib/cache/model-cache.ts` - replaced by React Query cache

---

### Step 11: Remove revalidatePath Calls

Server actions no longer need `revalidatePath("/")` since React Query handles cache invalidation. Remove from:

- `src/server/actions/chat.ts`: `createNewThread`, `deleteThread`, `renameThread`

---

## Migration Checklist

- [x] Install `@tanstack/react-query` and `zustand`
- [x] Create `src/lib/queries/query-provider.tsx`
- [x] Create `src/lib/stores/chat-ui-store.ts`
- [x] Create `src/lib/queries/use-user-settings.ts`
- [x] Create `src/lib/queries/use-threads.ts`
- [x] Create `src/app/api/threads/route.ts`
- [x] Create `src/lib/queries/use-models.ts`
- [x] Update `src/app/layout.tsx` (removed `UserSettingsProvider` and `ModelProvider`)
- [x] Update `src/components/sidebar/chat-sidebar.tsx` (convert to client component)
- [x] Update `src/app/page.tsx`
- [x] Update `src/app/chat/[id]/chat-thread.tsx`
- [x] Update `src/components/chat/chat-input.tsx`
- [x] Update `src/components/chat/model-selector.tsx`
- [x] Update settings components (`preferences-tab.tsx`, `integrations-tab.tsx`, `models-tab.tsx`)
- [x] Delete deprecated files
- [x] Remove `revalidatePath` calls from server actions
- [x] Run `bun run build` to verify no type errors
- [ ] Test all flows manually

---

## Benefits After Refactor

| Before | After |
|--------|-------|
| 3 custom React contexts | 0 custom contexts (just shadcn + next-themes) |
| Manual optimistic updates with rollback | React Query handles it |
| Manual localStorage cache for models | React Query gcTime handles it |
| Refs to capture state for callbacks | `useChatUIStore.getState()` |
| sessionStorage for pending message | Zustand store |
| Prop drilling input state | Zustand store |
| RSC sidebar with loading flicker | Client component with cached data |
| `revalidatePath` for cache busting | `queryClient.invalidateQueries` |
