"use client";

import { AlertCircle, BrainIcon, PaperclipIcon, SearchIcon, SendIcon, SquareIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import type { PendingFile } from "~/features/chat/components/messages/file-preview";

import { Button } from "~/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Kbd } from "~/components/ui/kbd";
import { Textarea } from "~/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { FilePreview } from "~/features/chat/components/messages/file-preview";
import { useFileAttachments } from "~/features/chat/hooks/use-file-attachments";
import { useChatUIStore } from "~/features/chat/store";
import { canUploadFiles, getAcceptedFileTypes, getModelCapabilities, useFavoriteModels, useModels } from "~/features/models";
import { useApiKeyStatus } from "~/features/settings/hooks/use-api-status";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { cn } from "~/lib/utils";

import { ModelSelector } from "./ui/model-selector";

type ChatInputProps = {
  className?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSendMessage: (content: string, files?: PendingFile[]) => void;
  isLoading?: boolean;
  onStop?: () => void;
  searchEnabled?: boolean;
  onSearchChangeAction?: (enabled: boolean) => void;
  reasoningLevel?: string;
  onReasoningChangeAction?: (level: string) => void;
};

function getAcceptedFileTypesDescription(capabilities: ReturnType<typeof getModelCapabilities>): string {
  const types: string[] = [];

  if (capabilities.supportsImages) {
    types.push("images");
  }

  // Plain text files are always supported
  types.push("text files (txt, md, code)");

  if (capabilities.supportsFiles) {
    types.push("JSON, CSV");
  }

  if (capabilities.supportsPdf) {
    types.push("PDFs");
  }

  return types.join(", ");
}

export function ChatInput({
  className,
  value,
  onValueChange,
  onSendMessage,
  isLoading = false,
  onStop,
  searchEnabled = false,
  onSearchChangeAction,
  reasoningLevel = "none",
  onReasoningChangeAction,
}: ChatInputProps) {
  const { data: settings } = useUserSettings();

  const { hasKey: hasOpenRouterKey, isLoading: isOpenRouterLoading } = useApiKeyStatus("openrouter");
  const { hasKey: hasParallelApiKey, isLoading: isParallelApiLoading } = useApiKeyStatus("parallel");

  const keyboardShortcut = settings?.sendMessageKeyboardShortcut || "enter";
  const inputHeightScale = settings?.inputHeightScale ?? 0;

  const favoriteModels = useFavoriteModels();
  const { isLoading: isModelsLoading } = useModels({ enabled: hasOpenRouterKey });
  const { selectedModelId, setSelectedModelId } = useChatUIStore();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const selectedModel = favoriteModels.find(m => m.id === selectedModelId);
  const capabilities = getModelCapabilities(selectedModel);
  const canUpload = canUploadFiles(capabilities);
  const acceptedTypes = getAcceptedFileTypes(capabilities);

  const {
    pendingFiles,
    fileInputRef,
    isUploading,
    handleRemoveFile,
    handlePaste,
    handleAttachClick,
    handleFileInputChange,
    clearPendingFiles,
  } = useFileAttachments({
    capabilities,
    onValueChange,
    textareaRef,
  });

  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!textareaRef.current)
      return;

    const lineCount = value.split("\n").length;
    const shouldExpand = lineCount > 2;

    if (shouldExpand !== isExpanded) {
      setIsExpanded(shouldExpand);
    }
  }, [value, isExpanded]);

  const canSendMessage = () => {
    // disabled={isLoading ? !onStop : (!value.trim() && pendingFiles.length === 0) || isUploading}
    if (isLoading) {
      return !onStop;
    }

    if (!value.trim()) {
      return false;
    }

    if (isUploading) {
      return false;
    }

    if (hasOpenRouterKey === false) {
      return false;
    }

    if (selectedModel === undefined) {
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) {
      onStop?.();
      return;
    }

    if (!canSendMessage()) {
      return;
    }

    const hasContent = value.trim() || pendingFiles.length > 0;
    if (!hasContent) {
      return;
    }

    const isUploading = pendingFiles.some(f => f.isUploading);
    if (isUploading) {
      return;
    }

    onSendMessage(value, pendingFiles.length > 0 ? pendingFiles : undefined);
    onValueChange("");
    clearPendingFiles();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // keyboardShortcut "enter" = Send on Enter, new line on Shift+Enter, don't send on Ctrl+Enter
    // keyboardShortcut "ctrlEnter" = Send on Ctrl+Enter, new line on Enter, don't send on Shift+Enter
    // keyboardShortcut "shiftEnter" = Send on Shift+Enter, new line on Enter, don't send on Ctrl+Enter
    if (
      ((keyboardShortcut === "enter" && e.key === "Enter" && !e.shiftKey && !e.ctrlKey)
        || (keyboardShortcut === "ctrlEnter" && e.key === "Enter" && e.ctrlKey)
        || (keyboardShortcut === "shiftEnter" && e.key === "Enter" && e.shiftKey))
    ) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn(`bg-background p-4 pt-0`, className)}>
      <div className="mx-auto max-w-3xl space-y-3">
        {hasOpenRouterKey === false && !isOpenRouterLoading && (
          <ApiWarningBadge />
        )}
        <form
          onSubmit={handleSubmit}
          className={cn(`
            border-border bg-background relative flex flex-col border
          `)}
        >
          {/* File Preview Area */}
          {pendingFiles.length > 0 && (
            <div className="border-border border-b p-3">
              <FilePreview
                files={pendingFiles}
                onRemoveAction={handleRemoveFile}
                supportsNativePdf={capabilities.supportsNativePdf}
              />
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={e => onValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type your message here..."
              disabled={hasOpenRouterKey === false}
              className={cn(`
                resize-none rounded-none border-0 px-3 py-3 pr-12 text-base
                transition-all duration-200 ease-out
                focus-visible:ring-0
                disabled:opacity-50
              `, isExpanded
                ? (
                    inputHeightScale === 1
                      ? "max-h-32 min-h-32"
                      : inputHeightScale === 2
                        ? `max-h-48 min-h-48`
                        : inputHeightScale === 3
                          ? `max-h-64 min-h-64`
                          : inputHeightScale === 4
                            ? `max-h-80 min-h-80`
                            : `max-h-16 min-h-16`
                  )
                : "max-h-16 min-h-16")}
              rows={2}
            />

            {keyboardShortcut !== "enter" && (
              <Kbd
                className={cn(
                  `
                    absolute right-2 bottom-2 transition-transform duration-150
                    ease-in-out
                  `,
                  value.trim().length === 0
                    ? "translate-y-1 scale-95 opacity-0"
                    : "translate-y-0 scale-100 opacity-100",
                )}
              >
                {keyboardShortcut === "ctrlEnter" && "Ctrl + Enter"}
                {keyboardShortcut === "shiftEnter" && "Shift + Enter"}
              </Kbd>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes || undefined}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={!canUpload}
          />

          {/* Bottom toolbar */}
          <div className={`
            border-border flex items-center justify-between border-t px-2 py-2
          `}
          >
            {/* Model Selector */}
            <ModelSelector
              models={favoriteModels}
              selectedModelId={selectedModelId || undefined}
              onSelectModelAction={setSelectedModelId}
              isLoading={isModelsLoading || isOpenRouterLoading}
            />

            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {capabilities.supportsReasoning && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={hasParallelApiKey === false}
                          className={cn(`
                            hover:text-foreground
                            gap-2 transition-colors
                          `, reasoningLevel !== "none"
                            ? `
                              text-primary
                              hover:text-primary/80 hover:bg-primary/10
                              dark:hover:text-primary/80
                              dark:hover:bg-primary/10
                            `
                            : `text-muted-foreground`)}
                          title={`Reasoning level: ${reasoningLevel}`}
                        >
                          <BrainIcon size={16} />
                          Reasoning
                          {reasoningLevel !== "none" && (
                            <>
                              {" "}
                              (
                              {reasoningLevel}
                              )
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {["xhigh", "high", "medium", "low", "minimal", "none"].map(level => (
                          <DropdownMenuItem key={level} onClick={() => onReasoningChangeAction?.(level)}>
                            {level}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {hasParallelApiKey === false && !isParallelApiLoading
                        ? "Configure your Parallel API key in settings to use reasoning"
                        : `Reasoning level: ${reasoningLevel}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              {capabilities.supportsSearch && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSearchChangeAction?.(!searchEnabled)}
                        disabled={hasParallelApiKey === false}
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
                      >
                        <SearchIcon size={16} />
                        Search
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {hasParallelApiKey === false && !isParallelApiLoading
                        ? "Configure your Parallel API key in settings to use search"
                        : searchEnabled
                          ? "Search is enabled for this message"
                          : "Search is disabled for this message"}
                    </p>
                  </TooltipContent>

                </Tooltip>
              )}

              {canUpload && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAttachClick}
                      disabled={hasOpenRouterKey === false}
                      className={cn(`
                        text-muted-foreground gap-2
                        hover:text-foreground
                      `, pendingFiles.length > 0 && "text-primary")}
                    >
                      <PaperclipIcon size={8} />
                      Attach
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {`Accepts: ${getAcceptedFileTypesDescription(capabilities)}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              <Button
                type={isLoading ? "button" : "submit"}
                size="icon"
                onClick={isLoading ? onStop : undefined}
                disabled={isLoading ? !onStop : !canSendMessage()}
                className="ml-1 size-8 shrink-0"
                title={isLoading ? "Stop generating" : "Send message"}
              >
                {isLoading
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
      className="flex gap-3 border border-amber-500/50 bg-amber-500/5 p-3"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
      <div
        className={`
          text-sm text-amber-800
          dark:text-amber-200
        `}
      >
        No API key configured. Set up your OpenRouter API key in
        <Link
          href="?settings=integrations"
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
