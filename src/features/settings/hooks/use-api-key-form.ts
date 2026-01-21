"use client";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import type { ApiKeyProvider } from "~/lib/api-keys/types";

import { useChatUIStore } from "~/features/chat/store";
import { apiKeyUpdateSchema } from "~/features/settings/types";

import { useRemoveApiKey, useSetApiKey, useUserSettings } from "./use-user-settings";

type StorageType = "client" | "server";

function useApiKeyState(provider: ApiKeyProvider) {
  const { data: settings, isLoading } = useUserSettings({ enabled: true });
  const clientKey = useChatUIStore(s =>
    provider === "openrouter" ? s.openrouterKey : s.parallelKey,
  );

  const hasClientKey = !!clientKey;
  const hasServerKey = settings?.configuredApiKeys?.[provider] ?? false;

  return {
    hasKey: hasClientKey || hasServerKey,
    source: hasClientKey ? "client" as const : hasServerKey ? "server" as const : null,
    isLoading,
  };
}

export function useApiKeyForm(provider: ApiKeyProvider) {
  const setApiKeyMutation = useSetApiKey();
  const removeApiKeyMutation = useRemoveApiKey();

  const setClientKey = useChatUIStore(state =>
    provider === "openrouter" ? state.setOpenRouterKey : state.setParallelKey,
  );
  const removeClientKey = useChatUIStore(state =>
    provider === "openrouter" ? state.removeOpenRouterKey : state.removeParallelKey,
  );

  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [storageType, setStorageType] = useState<StorageType | null>(null);

  const { hasKey, source, isLoading } = useApiKeyState(provider);

  const handleSave = async () => {
    if (!apiKey.trim())
      return;

    const finalStorageType = storageType || source;
    if (!finalStorageType)
      return;

    try {
      const validated = apiKeyUpdateSchema.parse({
        apiKey: apiKey.trim(),
        storeServerSide: finalStorageType === "server",
      });

      if (validated.storeServerSide) {
        await setApiKeyMutation.mutateAsync({
          provider,
          apiKey: validated.apiKey,
        });
      }
      else {
        setClientKey(validated.apiKey);
      }
      setApiKey("");
      setStorageType(null);
      toast.success(hasKey ? "API key updated" : "API key saved");
    }
    catch (error) {
      console.error("Failed to save API key:", error);
      const message = error instanceof z.ZodError
        ? error.issues.map(e => e.message).join(", ")
        : error instanceof Error
          ? error.message
          : "Failed to save API key";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    try {
      await removeApiKeyMutation.mutateAsync(provider);
      removeClientKey();
      setStorageType(null);
      toast.success("API key removed");
    }
    catch {
      toast.error("Failed to remove API key");
    }
  };

  const isSaving = setApiKeyMutation.isPending && setApiKeyMutation.variables?.provider === provider;
  const isDeleting = removeApiKeyMutation.isPending && removeApiKeyMutation.variables === provider;

  return {
    apiKey,
    setApiKey,
    showApiKey,
    setShowApiKey,
    storageType,
    setStorageType,
    hasKey,
    source,
    isLoading,
    isSaving,
    isDeleting,
    handleSave,
    handleDelete,
  };
}
