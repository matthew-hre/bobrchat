"use client";

import type { UseChatHelpers } from "@ai-sdk/react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ScrollArea } from "~/components/ui/scroll-area";
import { useChatScroll } from "~/features/chat/hooks/use-chat-scroll";
import { cn } from "~/lib/utils";

import { BetaBanner } from "./beta-banner";
import { ChatInput } from "./chat-input";

export function ChatView({
  messages,
  sendMessage,
  isLoading,
  onStop,
  threadId,
  children,
}: {
  messages: ChatUIMessage[];
  sendMessage: UseChatHelpers<ChatUIMessage>["sendMessage"];
  isLoading?: boolean;
  onStop?: () => void;
  threadId?: string;
  children: React.ReactNode;
}) {
  const { scrollRef, messagesEndRef, isInitialScrollComplete } = useChatScroll(messages, { threadId });

  return (
    <div className="flex h-full max-h-screen flex-col">
      <BetaBanner />
      <ScrollArea className="min-h-0 flex-1" ref={scrollRef}>
        <div className={cn(
          "origin-bottom transition-all duration-300 ease-out",
          isInitialScrollComplete && messages.length > 0
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-99 opacity-0",
        )}
        >
          {children}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="shrink-0">
        <ChatInput
          sendMessage={sendMessage}
          isLoading={isLoading}
          onStop={onStop}
        />
      </div>
    </div>
  );
}
