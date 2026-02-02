"use client";

import type { UseChatHelpers } from "@ai-sdk/react";

import * as React from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { useFileAttachments } from "~/features/attachments/hooks/use-file-attachments";
import { useChatUIStore } from "~/features/chat/store";
import {
  canUploadFiles,
  getAcceptedFileTypes,
  getModelCapabilities,
  useFavoriteModels,
  useModels,
} from "~/features/models";
import { useApiKeyStatus } from "~/features/settings/hooks/use-api-status";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

type UseChatInputControllerProps = {
  sendMessage: UseChatHelpers<ChatUIMessage>["sendMessage"];
  isLoading?: boolean;
  onStop?: () => void;
};

export function useChatInputController({
  sendMessage,
  isLoading = false,
  onStop,
}: UseChatInputControllerProps) {
  const { data: settings } = useUserSettings();
  const keyboardShortcut = settings?.sendMessageKeyboardShortcut || "enter";
  const inputHeightScale = settings?.inputHeightScale ?? 0;
  const autoCreateFilesFromPaste = settings?.autoCreateFilesFromPaste ?? true;

  const { hasKey: hasOpenRouterKey, isLoading: isOpenRouterLoading } = useApiKeyStatus("openrouter");
  const { hasKey: hasParallelApiKey, isLoading: isParallelApiLoading } = useApiKeyStatus("parallel");

  const favoriteModels = useFavoriteModels();
  const { isLoading: isModelsLoading } = useModels({ enabled: hasOpenRouterKey });

  const {
    input: value,
    setInput,
    selectedModelId,
    setSelectedModelId,
    searchEnabled,
    setSearchEnabled,
    reasoningLevel,
    setReasoningLevel,
  } = useChatUIStore();

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const selectedModel = React.useMemo(
    () => favoriteModels.find(m => m.id === selectedModelId),
    [favoriteModels, selectedModelId],
  );

  const capabilities = React.useMemo(
    () => getModelCapabilities(selectedModel),
    [selectedModel],
  );

  React.useEffect(() => {
    if (searchEnabled && !capabilities.supportsSearch) {
      setSearchEnabled(false);
    }
  }, [
    capabilities.supportsSearch,
    searchEnabled,
    setSearchEnabled,
  ]);

  const canUpload = canUploadFiles(capabilities);
  const acceptedTypes = getAcceptedFileTypes(capabilities);

  const attachments = useFileAttachments({
    capabilities,
    onValueChange: setInput,
    textareaRef,
    autoCreateFilesFromPaste,
  });

  const isExpanded = React.useMemo(
    () => value.split("\n").length > 2,
    [value],
  );

  const hasContent = value.trim().length > 0 || attachments.pendingFiles.length > 0;
  const hasUploadingFiles = attachments.pendingFiles.some(f => f.isUploading) || attachments.isUploading;

  const canSend = !isLoading
    && hasOpenRouterKey !== false
    && selectedModel !== undefined
    && hasContent
    && !hasUploadingFiles;

  const submit = React.useCallback((e?: React.FormEvent) => {
    e?.preventDefault();

    if (isLoading) {
      onStop?.();
      return;
    }

    if (!canSend) {
      return;
    }

    const fileUIParts = attachments.pendingFiles.map(f => ({
      type: "file" as const,
      id: f.id,
      url: f.url,
      storagePath: f.storagePath,
      mediaType: f.mediaType,
      filename: f.filename,
    }));

    sendMessage({
      text: value,
      files: fileUIParts.length > 0 ? fileUIParts : undefined,
    });

    setInput("");
    attachments.clearPendingFiles();
    textareaRef.current?.focus();
  }, [isLoading, onStop, canSend, attachments, sendMessage, value, setInput]);

  const onKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const shouldSend
      = (keyboardShortcut === "enter" && e.key === "Enter" && !e.shiftKey && !e.ctrlKey)
        || (keyboardShortcut === "ctrlEnter" && e.key === "Enter" && e.ctrlKey)
        || (keyboardShortcut === "shiftEnter" && e.key === "Enter" && e.shiftKey);

    if (shouldSend) {
      e.preventDefault();
      submit();
    }
  }, [keyboardShortcut, submit]);

  const toggleSearch = React.useCallback(() => {
    setSearchEnabled(!searchEnabled);
  }, [searchEnabled, setSearchEnabled]);

  return {
    input: {
      value,
      setValue: setInput,
      isExpanded,
      inputHeightScale,
      keyboardShortcut,
      textareaRef,
      onKeyDown,
    },

    apiStatus: {
      hasOpenRouterKey,
      isOpenRouterLoading,
      hasParallelApiKey,
      isParallelApiLoading,
    },

    model: {
      favorites: favoriteModels,
      selectedId: selectedModelId,
      setSelectedId: setSelectedModelId,
      isLoading: isModelsLoading,
      capabilities,
      canUpload,
      acceptedTypes,
    },

    features: {
      searchEnabled,
      toggleSearch,
      reasoningLevel,
      setReasoningLevel,
    },

    attachments,

    send: {
      canSend,
      submit,
      isLoading,
      onStop,
    },
  };
}

function getAcceptedFileTypesDescription(
  capabilities: ReturnType<typeof getModelCapabilities>,
): string {
  const types: string[] = [];

  if (capabilities.supportsImages) {
    types.push("images");
  }

  types.push("text files (txt, md, code)");

  if (capabilities.supportsFiles) {
    types.push("JSON, CSV");
  }

  if (capabilities.supportsPdf) {
    types.push("PDFs");
  }

  return types.join(", ");
}

export { getAcceptedFileTypesDescription };
