"use client";

import {
  PaperclipIcon,
  SearchIcon,
  SendIcon,
} from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

type ChatInputProps = {
  className?: string;
  value: string;
  onValueChange: (value: string) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  onStop?: () => void;
};

export function ChatInput({
  className,
  value,
  onValueChange,
  onSendMessage,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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
            disabled={false}
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
                disabled
                className={`
                  text-muted-foreground gap-2
                  hover:text-foreground
                `}
              >
                <SearchIcon size={8} />
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
