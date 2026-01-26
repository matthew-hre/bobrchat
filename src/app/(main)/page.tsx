"use client";

import type { UseChatHelpers } from "@ai-sdk/react";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { useSession } from "~/features/auth/lib/auth-client";
import { BetaBanner } from "~/features/chat/components/beta-banner";
import { ChatInput } from "~/features/chat/components/chat-input";
import { LandingPageContent } from "~/features/chat/components/landing/landing-page-content";
import { useCreateThread } from "~/features/chat/hooks/use-threads";
import { useChatUIStore } from "~/features/chat/store";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

export default function HomePage(): React.ReactNode {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: settings, isLoading } = useUserSettings({
    enabled: !!session,
  });
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
      { threadId, title: settings?.defaultThreadName },
      {
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Failed to create thread";
          toast.error(message);
        },
      },
    );
  };

  const landingPageContent = isLoading ? undefined : settings?.landingPageContent ?? "suggestions";
  const showLandingPage = !input.trim() && landingPageContent !== undefined && landingPageContent !== "blank";

  return (
    <div className="flex h-full max-h-screen flex-col">
      <BetaBanner />
      <div className="min-h-0 flex-1 overflow-auto">
        <LandingPageContent
          type={landingPageContent!}
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
