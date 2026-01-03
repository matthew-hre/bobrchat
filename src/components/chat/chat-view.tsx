"use client";

import type { UseChatHelpers } from "@ai-sdk/react";

import { useCallback } from "react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatInput } from "~/components/chat/chat-input";
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
  threadId,
  searchEnabled,
  onSearchChange,
}: {
  messages: ChatUIMessage[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: UseChatHelpers<ChatUIMessage>["sendMessage"];
  isLoading?: boolean;
  threadId?: string;
  searchEnabled?: boolean;
  onSearchChange?: (enabled: boolean) => void;
}) {
  const { scrollRef, messagesEndRef, isInitialScrollComplete } = useChatScroll(messages, { threadId });

  // Get sources from the latest assistant message
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
  const sources = lastAssistantMessage?.metadata?.sources || [];

  const handleSendMessage = useCallback((content: string) => {
    sendMessage({
      parts: [{ type: "text", text: content }],
    });
  }, [sendMessage]);

  return (
    <div className="flex h-full max-h-screen flex-col">
      <ScrollArea className="min-h-0 flex-1" ref={scrollRef}>
        <div className={cn(
          "origin-bottom transition-all duration-300 ease-out",
          isInitialScrollComplete
            ? "translate-y-0 scale-100 opacity-100"
            : `translate-y-2 scale-99 opacity-0`,
        )}
        >
          <ChatMessages messages={messages} isLoading={isLoading} sources={sources} />
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="shrink-0">
        <ChatInput
          value={input}
          onValueChange={setInput}
          onSendMessage={handleSendMessage}
          searchEnabled={searchEnabled}
          onSearchChange={onSearchChange}
        />
      </div>
    </div>
  );
}
