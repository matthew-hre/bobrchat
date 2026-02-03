"use client";

import type { UseChatHelpers } from "@ai-sdk/react";

import { AlertCircle, SendIcon, SquareIcon, Upload } from "lucide-react";
import Link from "next/link";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { Textarea } from "~/components/ui/textarea";
import { FilePreview } from "~/features/chat/components/messages/file-preview";
import {
  getAcceptedFileTypesDescription,
  useChatInputController,
} from "~/features/chat/hooks/use-chat-input-controller";
import { cn } from "~/lib/utils";

import { ChatInputCapabilities } from "./chat-input-capabilities";
import { ModelSelector } from "./ui/model-selector";

type ChatInputProps = {
  className?: string;
  sendMessage: UseChatHelpers<ChatUIMessage>["sendMessage"];
  isLoading?: boolean;
  onStop?: () => void;
};

export function ChatInput({
  className,
  sendMessage,
  isLoading = false,
  onStop,
}: ChatInputProps) {
  const { input, apiStatus, model, features, attachments, send } = useChatInputController({
    sendMessage,
    isLoading,
    onStop,
  });

  return (
    <div className={cn(`bg-background p-4 pt-0`, className)}>
      <div className="mx-auto max-w-3xl space-y-3">
        {apiStatus.hasOpenRouterKey === false && !apiStatus.isOpenRouterLoading && (
          <ApiWarningBadge />
        )}
        <form
          onSubmit={send.submit}
          onDragEnter={attachments.handleDragEnter}
          onDragLeave={attachments.handleDragLeave}
          onDragOver={attachments.handleDragOver}
          onDrop={attachments.handleDrop}
          className={cn(
            `border-border bg-background relative flex flex-col border`,
            attachments.isDragging && "ring-primary ring-2",
          )}
        >
          {/* Drop overlay */}
          <div
            className={cn(
              `
                pointer-events-none absolute inset-0 z-10 flex items-center
                justify-center transition-all duration-200 ease-out
              `,
              attachments.isDragging
                ? "bg-background/60 opacity-100 backdrop-blur-[2px]"
                : "pointer-events-none opacity-0",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 transition-transform duration-200",
                attachments.isDragging ? "scale-100" : "scale-95",
              )}
            >
              <Upload className="text-primary size-5" />
              <span className="text-sm font-medium">Drop files to upload</span>
            </div>
          </div>
          {/* File Preview Area */}
          {attachments.pendingFiles.length > 0 && (
            <div className="border-border border-b p-3">
              <FilePreview
                files={attachments.pendingFiles}
                onRemoveAction={attachments.handleRemoveFile}
                supportsNativePdf={model.capabilities.supportsNativePdf}
              />
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={input.textareaRef}
              value={input.value}
              onChange={e => input.setValue(e.target.value)}
              onKeyDown={input.onKeyDown}
              onPaste={attachments.handlePaste}
              placeholder="Type your message here..."
              disabled={apiStatus.hasOpenRouterKey === false}
              className={cn(`
                resize-none rounded-none border-0 px-3 py-3 pr-12 text-base
                transition-all duration-200 ease-out
                focus-visible:ring-0
                disabled:opacity-50
              `, input.isExpanded
                ? (
                    input.inputHeightScale === 1
                      ? "max-h-32 min-h-32"
                      : input.inputHeightScale === 2
                        ? `max-h-48 min-h-48`
                        : input.inputHeightScale === 3
                          ? `max-h-64 min-h-64`
                          : input.inputHeightScale === 4
                            ? `max-h-80 min-h-80`
                            : `max-h-16 min-h-16`
                  )
                : "max-h-16 min-h-16")}
              rows={2}
            />

            {input.keyboardShortcut !== "enter" && (
              <Kbd
                className={cn(
                  `
                    absolute right-2 bottom-2 transition-transform duration-150
                    ease-in-out
                  `,
                  input.value.trim().length === 0
                    ? "translate-y-1 scale-95 opacity-0"
                    : "translate-y-0 scale-100 opacity-100",
                )}
              >
                {input.keyboardShortcut === "ctrlEnter" && "Ctrl + Enter"}
                {input.keyboardShortcut === "shiftEnter" && "Shift + Enter"}
              </Kbd>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={attachments.fileInputRef}
            type="file"
            multiple
            accept={model.acceptedTypes || undefined}
            onChange={attachments.handleFileInputChange}
            className="hidden"
            disabled={!model.canUpload}
          />

          {/* Bottom toolbar */}
          <div className={`
            border-border flex items-center justify-between border-t px-2 py-2
          `}
          >
            {/* Model Selector */}
            <ModelSelector
              models={model.favorites}
              selectedModelId={model.selectedId || undefined}
              onSelectModelAction={model.setSelectedId}
              popoverWidth="w-full"
              isLoading={model.isLoading || apiStatus.isOpenRouterLoading}
            />

            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {/* Capabilities Menu */}
              <ChatInputCapabilities
                capabilities={model.capabilities}
                reasoningLevel={features.reasoningLevel}
                searchEnabled={features.searchEnabled}
                pendingFilesCount={attachments.pendingFiles.length}
                hasOpenRouterKey={apiStatus.hasOpenRouterKey}
                hasParallelApiKey={apiStatus.hasParallelApiKey}
                isParallelApiLoading={apiStatus.isParallelApiLoading}
                onReasoningLevelChange={features.setReasoningLevel}
                onSearchToggle={features.toggleSearch}
                onAttachClick={attachments.handleAttachClick}
                acceptedFileTypesDescription={getAcceptedFileTypesDescription(model.capabilities)}
              />

              <Button
                type={send.isLoading ? "button" : "submit"}
                size="icon"
                onClick={send.isLoading ? send.onStop : undefined}
                disabled={send.isLoading ? !send.onStop : !send.canSend}
                className="ml-1 size-8 shrink-0"
                title={send.isLoading ? "Stop generating" : "Send message"}
              >
                {send.isLoading
                  ? <SquareIcon size={8} />
                  : <SendIcon size={8} />}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApiWarningBadge() {
  return (
    <div
      className="border-warning/50 bg-warning/10 flex gap-3 border p-3"
    >
      <AlertCircle className="text-warning mt-0.5 size-5 shrink-0" />
      <div className="text-warning-foreground text-sm">
        No API key configured. Set up your OpenRouter API key in
        <Link
          href="/settings?tab=integrations"
          className={`
            ml-1 font-semibold underline
            hover:no-underline
          `}
        >
          settings
        </Link>
        {" "}
        to send messages.
      </div>
    </div>
  );
}
