"use client";

import type { UseChatHelpers } from "@ai-sdk/react";

import { useCallback } from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";
import type { PendingFile } from "~/components/chat/file-preview";
import type { LandingPageContentType } from "~/lib/db/schema/settings";

import { ChatInput } from "~/components/chat/chat-input";
import { LandingPageContent } from "~/components/chat/landing-page-content";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useChatScroll } from "~/hooks/use-chat-scroll";
import { cn } from "~/lib/utils";

import { ChatMessages } from "./chat-messages";

export function ChatView({
  messages,
  input,
  setInput,
  sendMessage,
  isLoading,
  onStop,
  threadId,
  searchEnabled,
  onSearchChange,
  landingPageContent,
  showLandingPage,
  hasApiKey,
}: {
  messages: ChatUIMessage[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: UseChatHelpers<ChatUIMessage>["sendMessage"];
  isLoading?: boolean;
  onStop?: () => void;
  threadId?: string;
  searchEnabled?: boolean;
  onSearchChange?: (enabled: boolean) => void;
  landingPageContent?: LandingPageContentType;
  showLandingPage?: boolean;
  hasApiKey?: boolean;
}) {
  const { scrollRef, messagesEndRef, isInitialScrollComplete } = useChatScroll(messages, { threadId });

  const handleSendMessage = useCallback((content: string, files?: PendingFile[]) => {
    const fileUIParts = files?.map(f => ({
      type: "file" as const,
      url: f.url,
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
              <LandingPageContent type={landingPageContent!} isVisible={!!showLandingPageContent} onSuggestionClick={handleSuggestionClick} />
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
          <ChatMessages messages={messages} isLoading={isLoading} searchEnabled={searchEnabled} />
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="shrink-0">
        <ChatInput
          value={input}
          onValueChange={setInput}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onStop={onStop}
          searchEnabled={searchEnabled}
          onSearchChange={onSearchChange}
          hasApiKey={hasApiKey}
        />
      </div>
    </div>
  );
}
