"use client";

import type { UseChatHelpers } from "@ai-sdk/react";

import { useRouter } from "next/navigation";
import { use, useCallback } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/features/chat/types";
import type { UserSettingsData } from "~/features/settings/types";
import type { ThreadIcon } from "~/lib/db/schema/chat";

import { BetaBanner } from "~/features/chat/components/beta-banner";
import { ChatInput } from "~/features/chat/components/chat-input";
import { LandingPageContent } from "~/features/chat/components/landing/landing-page-content";
import { useCreateThread } from "~/features/chat/hooks/use-threads";
import { useChatUIStore } from "~/features/chat/store";
import { UserSettingsContext } from "~/features/settings/settings-context";

const FALLBACK_SETTINGS: Pick<UserSettingsData, "defaultThreadName" | "defaultThreadIcon" | "landingPageContent"> = {
  defaultThreadName: "New Chat",
  defaultThreadIcon: "message-circle" as ThreadIcon,
  landingPageContent: "suggestions",
};

export function AuthenticatedHome(): React.ReactNode {
  const settings = use(UserSettingsContext);
  const resolvedSettings = settings ?? FALLBACK_SETTINGS;
  const router = useRouter();
  const input = useChatUIStore(state => state.input);
  const setInput = useChatUIStore(state => state.setInput);
  const createThread = useCreateThread();

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
  }, [setInput]);

  const handleSendMessage: UseChatHelpers<ChatUIMessage>["sendMessage"] = async (messageParts) => {
    const threadId = crypto.randomUUID();

    sessionStorage.setItem(`initial_${threadId}`, JSON.stringify(messageParts));

    router.push(`/chat/${threadId}`);

    createThread.mutate(
      { threadId, title: resolvedSettings.defaultThreadName, icon: resolvedSettings.defaultThreadIcon },
      {
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Failed to create thread";
          toast.error(message);
        },
      },
    );
  };

  const showLandingPage = !input.trim() && resolvedSettings.landingPageContent !== "blank";

  return (
    <div className="flex h-full max-h-screen flex-col">
      <BetaBanner />
      <div className="min-h-0 flex-1 overflow-auto">
        <LandingPageContent
          type={resolvedSettings.landingPageContent}
          isVisible={showLandingPage}
          onSuggestionClickAction={handleSuggestionClick}
        />
      </div>
      <div className="shrink-0">
        <ChatInput
          sendMessage={handleSendMessage}
          isLoading={createThread.isPending}
        />
      </div>
    </div>
  );
}
