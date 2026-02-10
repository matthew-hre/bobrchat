"use client";

import { useQuery } from "@tanstack/react-query";
import { CoinsIcon, LoaderIcon } from "lucide-react";

import { useChatUIStore } from "~/features/chat/store";
import { getOpenRouterCredits } from "~/features/settings/actions";
import { useApiKeyStatus } from "~/features/settings/hooks/use-api-status";
import { OPENROUTER_CREDITS_KEY } from "~/features/settings/hooks/use-user-settings";

export function OpenRouterCreditsWidget() {
  const { hasKey, source, isLoading: isKeyLoading } = useApiKeyStatus("openrouter");
  const openrouterClientKey = useChatUIStore(s => s.openrouterKey) ?? undefined;

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: [...OPENROUTER_CREDITS_KEY, openrouterClientKey ?? "", source],
    queryFn: () => getOpenRouterCredits({ openrouterClientKey }),
    staleTime: 60_000,
    enabled: hasKey && !isKeyLoading,
  });

  if (isKeyLoading || isLoading) {
    return (
      <>
        <LoaderIcon className="text-muted-foreground size-3 animate-spin" />
        Loading credits...
      </>
    );
  }

  if (!hasKey) {
    return (
      <>
        <CoinsIcon className="text-muted-foreground size-3" />
        No OpenRouter key
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <CoinsIcon className="text-muted-foreground size-3" />
        Credits unavailable
      </>
    );
  }

  const formatCredits = (value: number) => {
    if (value >= 1)
      return `$${value.toFixed(2)}`;
    if (value >= 0.01)
      return `$${value.toFixed(3)}`;
    return `$${value.toFixed(4)}`;
  };

  return (
    <>
      {isFetching
        ? <LoaderIcon className="text-muted-foreground size-3 animate-spin" />
        : <CoinsIcon className="text-muted-foreground size-3" />}
      {`${formatCredits(data.remaining)} remaining`}
    </>
  );
}
