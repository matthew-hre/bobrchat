/* eslint-disable react/no-array-index-key */
"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { MessageAttachments } from "./messages/file-preview";
import { MemoizedMarkdown } from "./messages/markdown";
import { ReasoningContent } from "./ui/reasoning-content";
import { SearchingSources } from "./ui/searching-sources";

function SharedCopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy message content");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      title="Copy message content"
      className="h-6 w-6 p-0"
    >
      {copied
        ? <CheckIcon className="h-3.5 w-3.5" />
        : <CopyIcon className="h-3.5 w-3.5" />}
    </Button>
  );
}

type FilePart = {
  type: "file";
  url?: string;
  filename?: string;
  mediaType?: string;
};

function extractTextAndAttachments(message: ChatUIMessage): {
  textContent: string;
  attachments: Array<{ url: string; filename?: string; mediaType?: string }>;
} {
  const textParts = message.parts
    .filter(part => part.type === "text")
    .map(part => part.text);

  const attachments = message.parts
    .filter(part => part.type === "file")
    .map((part) => {
      const filePart = part as FilePart;
      return {
        url: filePart.url || "",
        filename: filePart.filename,
        mediaType: filePart.mediaType,
      };
    })
    .filter(a => a.url || a.filename);

  return {
    textContent: textParts.join(""),
    attachments,
  };
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
          const { textContent, attachments } = extractTextAndAttachments(message);

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

        const assistantTextContent = message.parts
          .filter(part => part.type === "text")
          .map(part => part.text)
          .join("");
        const modelName = message.metadata?.model;

        return (
          <div key={message.id} className="group markdown text-base">
            {message.parts.map((part, index) => {
              if (part.type === "reasoning") {
                const reasoningPart = part as {
                  type: "reasoning";
                  text: string;
                  state?: string;
                };

                const cleanedText = (reasoningPart.text || "")
                  .replace(/\n\s*\[REDACTED\]/g, "")
                  .replace(/\[REDACTED\]/g, "")
                  .replace(/\\n/g, "\n")
                  .replace(/\n\s*\n/g, "\n")
                  .trim();
                if (!cleanedText) {
                  return null;
                }

                return (
                  <ReasoningContent
                    key={`part-${index}`}
                    content={cleanedText}
                    isThinking={false}
                  />
                );
              }

              if (part.type === "text") {
                return (
                  <MemoizedMarkdown
                    key={`part-${index}`}
                    id={`${message.id}-${index}`}
                    content={part.text}
                  />
                );
              }

              const isSearchTool = part.type === "tool-search"
                || (part.type === "tool-invocation" && (part as { toolName?: string }).toolName === "search");

              if (isSearchTool) {
                let sources: Array<{ id: string; sourceType: string; url: string; title: string }> = [];
                let searchError: string | undefined;

                const sp = part as {
                  type: string;
                  output?: { error?: boolean; message?: string; results?: Array<{ url: string; title: string }> };
                  state?: string;
                  result?: { error?: boolean; message?: string; results?: Array<{ url: string; title: string }> } | Array<{ url: string; title: string }>;
                };

                if (sp.type === "tool-search") {
                  if (sp.output?.error) {
                    searchError = sp.output.message || "Search failed";
                  }
                  else if (sp.output?.results && Array.isArray(sp.output.results)) {
                    sources = sp.output.results.map(r => ({
                      id: r.url || Math.random().toString(),
                      sourceType: "url",
                      url: r.url,
                      title: r.title,
                    }));
                  }
                }
                else if (sp.type === "tool-invocation" && sp.state === "result") {
                  const result = sp.result;
                  if (result && typeof result === "object" && "error" in result && result.error) {
                    searchError = (result as { message?: string }).message || "Search failed";
                  }
                  else {
                    const results = (result && typeof result === "object" && "results" in result
                      ? (result as { results: Array<{ url: string; title: string }> }).results
                      : Array.isArray(result) ? result : []) as Array<{ url: string; title: string }>;
                    sources = results.map(r => ({
                      id: r.url || Math.random().toString(),
                      sourceType: "url",
                      url: r.url,
                      title: r.title,
                    }));
                  }
                }

                return (
                  <SearchingSources
                    key={`part-${index}`}
                    sources={sources}
                    isSearching={false}
                    error={searchError}
                  />
                );
              }

              return null;
            })}
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
