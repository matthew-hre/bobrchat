"use client";

import { KeyIcon, LoaderIcon } from "lucide-react";

import { useApiKeyStatus } from "~/features/settings/hooks/use-api-status";

export function ApiKeyStatusWidget() {
  const { hasKey: hasOpenRouterKey, isLoading: isOpenRouterLoading } = useApiKeyStatus("openrouter");
  const { hasKey: hasParallelKey, isLoading: isParallelLoading } = useApiKeyStatus("parallel");

  const isLoading = isOpenRouterLoading || isParallelLoading;

  const getApiKeyStatus = () => {
    if (!hasOpenRouterKey && !hasParallelKey) {
      return "No API Keys Set";
    }
    if (hasOpenRouterKey && !hasParallelKey) {
      return "OpenRouter Key Set";
    }
    if (!hasOpenRouterKey && hasParallelKey) {
      return "No OpenRouter Key Set";
    }
    return "All API Keys Set";
  };

  if (isLoading) {
    return (
      <>
        <LoaderIcon className="text-muted-foreground size-3 animate-spin" />
        Checking API keys...
      </>
    );
  }

  return (
    <>
      <KeyIcon className="text-muted-foreground size-3" />
      {getApiKeyStatus()}
    </>
  );
}
