"use client";

import type { UseChatHelpers } from "@ai-sdk/react";

import { useCallback } from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";
import type { LandingPageContentType } from "~/features/settings/types";

import { ScrollArea } from "~/components/ui/scroll-area";
import { useChatScroll } from "~/features/chat/hooks/use-chat-scroll";
import { useChatUIStore } from "~/features/chat/store";
import { cn } from "~/lib/utils";

import type { PendingFile } from "./messages/file-preview";

import { BetaBanner } from "./beta-banner";
import { ChatInput } from "./chat-input";
import { LandingPageContent } from "./landing/landing-page-content";

export function ChatView({
  messages,
  sendMessage,
  isLoading,
  onStop,
  threadId,
  landingPageContent,
  showLandingPage,
  children,
}: {
  messages: ChatUIMessage[];
  sendMessage: UseChatHelpers<ChatUIMessage>["sendMessage"];
  isLoading?: boolean;
  onStop?: () => void;
  threadId?: string;
  landingPageContent?: LandingPageContentType;
  showLandingPage?: boolean;
  children?: React.ReactNode;
}) {
  const { setInput } = useChatUIStore();
  const { scrollRef, messagesEndRef, isInitialScrollComplete } = useChatScroll(messages, { threadId });

  const handleSendMessage = useCallback((content: string, files?: PendingFile[]) => {
    const fileUIParts = files?.map(f => ({
      type: "file" as const,
      id: f.id,
      url: f.url,
      storagePath: f.storagePath,
      mediaType: f.mediaType,
      filename: f.filename,
    }));

    sendMessage({
      text: content,
      files: fileUIParts,
    });
  }, [sendMessage]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
  }, [setInput]);

  const showLandingPageContent = messages.length === 0 && showLandingPage && landingPageContent !== undefined && landingPageContent !== "blank";

  return (
    <div className="flex h-full max-h-screen flex-col">
      <BetaBanner />
      <ScrollArea className="min-h-0 flex-1" ref={scrollRef}>
        {messages.length === 0 && (
          <div
            className={cn(
              `
                flex justify-center p-4 pt-[33vh] transition-all duration-300
                ease-in-out
              `,
              showLandingPageContent
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0",
            )}
          >
            <div className="h-max w-full max-w-lg">
              <LandingPageContent
                type={landingPageContent!}
                isVisible={!!showLandingPageContent}
                onSuggestionClickAction={handleSuggestionClick}
              />
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className={cn(
          "origin-bottom transition-all duration-300 ease-out",
          isInitialScrollComplete && !showLandingPageContent
            ? "translate-y-0 scale-100 opacity-100"
            : `translate-y-2 scale-99 opacity-0`,
        )}
        >
          {children}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="shrink-0">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onStop={onStop}
        />
      </div>
    </div>
  );
}
