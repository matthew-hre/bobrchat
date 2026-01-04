"use client";

import { AlertCircle, PaperclipIcon, SearchIcon, SendIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "~/lib/utils";

import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

type ChatInputProps = {
  className?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSendMessage: (content: string) => void;
  searchEnabled?: boolean;
  onSearchChange?: (enabled: boolean) => void;
};

export function ChatInput({
  className,
  value,
  onValueChange,
  onSendMessage,
  searchEnabled = false,
  onSearchChange,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkApiKey() {
      try {
        const response = await fetch("/api/user/api-key-status");
        if (response.ok) {
          const data = await response.json();
          setHasApiKey(data.hasApiKey);
        }
      }
      catch (error) {
        console.error("Failed to check API key status:", error);
        toast.error("Failed to check API key status");
        setHasApiKey(false);
      }
    }

    checkApiKey();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(value);
    onValueChange("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn(`bg-background p-4 pt-0`, className)}>
      <div className="mx-auto max-w-3xl space-y-3">
        {/* API Key Warning */}
        {hasApiKey === false && (
          <div
            className={`
              flex gap-3 border border-amber-500/50 bg-amber-500/5 p-3
            `}
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div
              className={`
                text-sm text-amber-800
                dark:text-amber-200
              `}
            >
              No API key configured. Set up your OpenRouter API key in
              <a
                href="/settings?tab=integrations"
                className={`
                  ml-1 font-semibold underline
                  hover:no-underline
                `}
              >
                settings
              </a>
              {" "}
              to send messages.
            </div>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className={cn(`
            border-border bg-background relative flex flex-col border
          `)}
        >
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={e => onValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            disabled={hasApiKey === false}
            className={`
              max-h-50 min-h-13 resize-none border-0 px-3 py-3 text-base
              focus-visible:ring-0
              disabled:opacity-50
            `}
            rows={2}
          />

          {/* Bottom toolbar */}
          <div className={`
            border-border flex items-center justify-between border-t px-2 py-2
          `}
          >
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange?.(!searchEnabled)}
                className={cn(`
                  hover:text-foreground
                  gap-2 transition-colors
                `, searchEnabled
                  ? `
                    text-primary
                    hover:text-primary/80 hover:bg-primary/10
                    dark:hover:text-primary/80 dark:hover:bg-primary/10
                  `
                  : `text-muted-foreground`)}
                title={searchEnabled ? "Search enabled" : "Search disabled"}
                suppressHydrationWarning
              >
                <SearchIcon size={16} />
                Search
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className={`
                  text-muted-foreground gap-2
                  hover:text-foreground
                `}
              >
                <PaperclipIcon size={8} />
                Attach
              </Button>

              <Button
                type="submit"
                size="icon"
                disabled={!value.trim()}
                className="ml-1 size-8 shrink-0"
                title="Send message"
              >
                <SendIcon size={8} />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
