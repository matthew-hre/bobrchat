import type { UseChatHelpers } from "@ai-sdk/react";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatInput } from "~/components/chat/chat-input";
import { ScrollArea } from "~/components/ui/scroll-area";

import { ChatMessages } from "./chat-messages";

export function ChatView({
  messages,
  input,
  setInput,
  sendMessage,
}: {
  messages: ChatUIMessage[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: UseChatHelpers<ChatUIMessage>["sendMessage"];
}) {
  return (
    <div className="flex h-full max-h-screen flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <ChatMessages messages={messages} />
      </ScrollArea>
      <div className="shrink-0">
        <ChatInput
          value={input}
          onValueChange={setInput}
          onSendMessage={(content) => {
            sendMessage({
              parts: [{ type: "text", text: content }],
            });
          }}
        />
      </div>
    </div>
  );
}
