"use client";

import { CheckIcon, CopyIcon } from "lucide-react";

import type { ChatUIMessage, FileUIPart } from "~/features/chat/types";

import { Button } from "~/components/ui/button";
import { isFilePart } from "~/features/chat/types";
import { extractMessageText, MessageParts } from "~/features/chat/ui/parts";
import { useCopyToClipboard } from "~/lib/hooks";
import { cn } from "~/lib/utils";

import { MessageAttachments } from "./messages/file-preview";

function SharedCopyButton({ content }: { content: string }) {
  const { copied, copy } = useCopyToClipboard({
    errorMessage: "Failed to copy message content",
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copy(content)}
      title="Copy message content"
      className="h-6 w-6 p-0"
    >
      {copied
        ? <CheckIcon className="h-3.5 w-3.5" />
        : <CopyIcon className="h-3.5 w-3.5" />}
    </Button>
  );
}

function extractAttachments(message: ChatUIMessage): Array<{ url: string; filename?: string; mediaType?: string }> {
  const attachments: Array<{ url: string; filename?: string; mediaType?: string }> = [];

  for (const part of message.parts) {
    if (isFilePart(part)) {
      const filePart = part as FileUIPart;
      if (filePart.url || filePart.filename) {
        attachments.push({
          url: filePart.url || "",
          filename: filePart.filename,
          mediaType: filePart.mediaType,
        });
      }
    }
  }

  return attachments;
}

type SharedChatMessagesProps = {
  messages: ChatUIMessage[];
  showAttachments: boolean;
};

export function SharedChatMessages({ messages, showAttachments }: SharedChatMessagesProps) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 py-8">
      {messages.map((message) => {
        if (message.role === "user") {
          const textContent = extractMessageText(message.parts);
          const attachments = extractAttachments(message);

          return (
            <div
              key={message.id}
              className="flex w-full flex-col items-end gap-2"
            >
              <div className={`
                relative w-full max-w-[80%]
                md:max-w-[70%]
              `}
              >
                <div className="flex flex-col items-end">
                  <div className="group flex w-full flex-col items-end gap-2">
                    {textContent && (
                      <div
                        className={`
                          bg-primary text-primary-foreground prose prose-sm
                          rounded-2xl rounded-br-sm px-4 py-2.5
                        `}
                      >
                        <p className="wrap-break-word whitespace-pre-wrap">{textContent}</p>
                        {attachments.length > 0 && (
                          <MessageAttachments
                            attachments={attachments}
                            showContent={showAttachments}
                          />
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        `
                          text-muted-foreground flex items-center gap-2 text-xs
                          transition-opacity duration-200
                        `,
                        `
                          opacity-0
                          group-hover:opacity-100
                        `,
                      )}
                    >
                      <SharedCopyButton content={textContent} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        const assistantTextContent = extractMessageText(message.parts);
        const modelName = message.metadata?.model;

        return (
          <div key={message.id} className="group markdown text-base">
            <MessageParts
              messageId={message.id}
              parts={message.parts}
              mode="shared"
            />
            <div
              className={cn(
                `
                  text-muted-foreground mt-2 flex items-center gap-2 text-xs
                  transition-opacity duration-200
                `,
                `
                  opacity-0
                  group-hover:opacity-100
                `,
              )}
            >
              <SharedCopyButton content={assistantTextContent} />
              {modelName && <span className="font-medium">{modelName}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
