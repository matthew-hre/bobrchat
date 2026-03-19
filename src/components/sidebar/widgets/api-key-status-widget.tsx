"use client";

import { KeyIcon, LoaderIcon } from "lucide-react";

import { useApiKeyStatus } from "~/features/settings/hooks/use-api-status";

export function ApiKeyStatusWidget() {
  const { hasKey: hasOpenRouterKey, isLoading: isOpenRouterLoading } = useApiKeyStatus("openrouter");
  const { hasKey: hasParallelKey, isLoading: isParallelLoading } = useApiKeyStatus("parallel");
  const { hasKey: hasOpenAIKey, isLoading: isOpenAILoading } = useApiKeyStatus("openai");
  const { hasKey: hasAnthropicKey, isLoading: isAnthropicLoading } = useApiKeyStatus("anthropic");

  const isLoading = isOpenRouterLoading || isParallelLoading || isOpenAILoading || isAnthropicLoading;

  const getApiKeyStatus = () => {
    const keyCount = [hasOpenRouterKey, hasOpenAIKey, hasAnthropicKey, hasParallelKey].filter(Boolean).length;
    if (keyCount === 0) {
      return "No API Keys Set";
    }
    if (keyCount === 4) {
      return "All API Keys Set";
    }
    const names: string[] = [];
    if (hasOpenRouterKey)
      names.push("OpenRouter");
    if (hasOpenAIKey)
      names.push("OpenAI");
    if (hasAnthropicKey)
      names.push("Anthropic");
    if (hasParallelKey)
      names.push("Parallel");
    return `${names.join(", ")} ${keyCount === 1 ? "Key" : "Keys"} Set`;
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
