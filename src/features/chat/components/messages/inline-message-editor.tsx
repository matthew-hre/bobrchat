"use client";

import { BrainIcon, PaperclipIcon, SearchIcon, SendIcon, XIcon } from "lucide-react";
import * as React from "react";

import type { PendingFile } from "~/features/chat/components/messages/file-preview";

import { Button } from "~/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Textarea } from "~/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { useFileAttachments } from "~/features/attachments/hooks/use-file-attachments";
import { FilePreview } from "~/features/chat/components/messages/file-preview";
import { ModelSelector } from "~/features/chat/components/ui/model-selector";
import { canUploadFiles, getAcceptedFileTypes, getModelCapabilities, useFavoriteModels } from "~/features/models";
import { useApiKeyStatus } from "~/features/settings/hooks/use-api-status";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { cn } from "~/lib/utils";

export type ExistingAttachment = {
  id: string;
  url: string;
  filename?: string;
  mediaType?: string;
  storagePath?: string;
};

export type EditedMessagePayload = {
  content: string;
  searchEnabled: boolean;
  reasoningLevel: string;
  modelId: string | null;
  keptAttachments: ExistingAttachment[];
  removedAttachmentIds: string[];
  newFiles: PendingFile[];
};

type InlineMessageEditorProps = {
  initialContent: string;
  initialAttachments: ExistingAttachment[];
  initialSearchEnabled: boolean;
  initialReasoningLevel: string;
  initialModelId: string | null;
  onCancel: () => void;
  onSubmit: (payload: EditedMessagePayload) => Promise<void>;
  isSubmitting?: boolean;
};

export function InlineMessageEditor({
  initialContent,
  initialAttachments,
  initialSearchEnabled,
  initialReasoningLevel,
  initialModelId,
  onCancel,
  onSubmit,
  isSubmitting = false,
}: InlineMessageEditorProps) {
  const [content, setContent] = React.useState(initialContent);
  const [searchEnabled, setSearchEnabled] = React.useState(initialSearchEnabled);
  const [reasoningLevel, setReasoningLevel] = React.useState(initialReasoningLevel);
  const [existingAttachments, setExistingAttachments] = React.useState<ExistingAttachment[]>(initialAttachments);
  const [removedAttachmentIds, setRemovedAttachmentIds] = React.useState<string[]>([]);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const { data: settings } = useUserSettings();
  const keyboardShortcut = settings?.sendMessageKeyboardShortcut || "enter";

  const { hasKey: hasParallelApiKey, isLoading: isParallelApiLoading } = useApiKeyStatus("parallel");

  const { models: favoriteModels } = useFavoriteModels();
  const [selectedModelId, setSelectedModelId] = React.useState<string | null>(
    initialModelId || favoriteModels[0]?.id || null,
  );
  const selectedModel = favoriteModels.find(m => m.id === selectedModelId);
  const capabilities = getModelCapabilities(selectedModel);
  const canUpload = canUploadFiles(capabilities);
  const acceptedTypes = getAcceptedFileTypes(capabilities);

  const {
    pendingFiles,
    fileInputRef,
    isUploading,
    handleRemoveFile: handleRemoveNewFile,
    handlePaste,
    handleAttachClick,
    handleFileInputChange,
  } = useFileAttachments({
    capabilities,
    onValueChange: setContent,
    textareaRef,
    autoCreateFilesFromPaste: settings?.autoCreateFilesFromPaste ?? true,
  });

  React.useEffect(() => {
    textareaRef.current?.focus();
    const length = textareaRef.current?.value.length ?? 0;
    textareaRef.current?.setSelectionRange(length, length);
  }, []);

  const handleRemoveExistingAttachment = React.useCallback((id: string) => {
    setExistingAttachments(prev => prev.filter(a => a.id !== id));
    setRemovedAttachmentIds(prev => [...prev, id]);
  }, []);

  const canSend = () => {
    if (isSubmitting || isUploading)
      return false;
    if (!content.trim() && existingAttachments.length === 0 && pendingFiles.length === 0)
      return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend())
      return;

    await onSubmit({
      content: content.trim(),
      searchEnabled,
      reasoningLevel,
      modelId: selectedModelId,
      keptAttachments: existingAttachments,
      removedAttachmentIds,
      newFiles: pendingFiles,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (
      (keyboardShortcut === "enter" && e.key === "Enter" && !e.shiftKey && !e.ctrlKey)
      || (keyboardShortcut === "ctrlEnter" && e.key === "Enter" && e.ctrlKey)
      || (keyboardShortcut === "shiftEnter" && e.key === "Enter" && e.shiftKey)
    ) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const allAttachments = [
    ...existingAttachments.map(a => ({
      id: a.id,
      filename: a.filename ?? "File",
      mediaType: a.mediaType ?? "application/octet-stream",
      url: a.url,
      storagePath: a.storagePath,
      isExisting: true as const,
    })),
    ...pendingFiles.map(f => ({
      ...f,
      isExisting: false as const,
    })),
  ];

  const handleRemoveAttachment = (id: string) => {
    const attachment = allAttachments.find(a => a.id === id);
    if (attachment?.isExisting) {
      handleRemoveExistingAttachment(id);
    }
    else {
      handleRemoveNewFile(id);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(`
        border-primary/50 bg-background animate-in fade-in-0 zoom-in-95 relative
        flex w-full flex-col border shadow-lg duration-200
      `)}
    >
      {allAttachments.length > 0 && (
        <div className="border-border border-b p-3">
          <FilePreview
            files={allAttachments}
            onRemoveAction={handleRemoveAttachment}
            supportsNativePdf={capabilities.supportsNativePdf}
          />
        </div>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Edit your message..."
          className={cn(`
            max-h-48 min-h-24 resize-none rounded-none border-0 px-3 py-3
            text-base transition-all duration-200 ease-out
            focus-visible:ring-0
          `)}
          rows={3}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes || undefined}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={!canUpload}
      />

      <div className={`
        border-border flex items-center justify-between border-t px-2 py-2
      `}
      >
        <div className="flex items-center gap-1">
          <ModelSelector
            models={favoriteModels}
            selectedModelId={selectedModelId || undefined}
            onSelectModelAction={setSelectedModelId}
            sideOffset={8}
          />

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
                        group/toggle gap-0 overflow-hidden text-xs
                        transition-all
                      `, reasoningLevel !== "none"
                        ? `
                          text-primary
                          hover:text-primary/80 hover:bg-primary/10
                        `
                        : `text-muted-foreground`)}
                    >
                      <BrainIcon size={14} className="shrink-0" />
                      <span className={`
                        max-w-0 overflow-hidden whitespace-nowrap opacity-0
                        transition-all duration-200
                        group-hover/toggle:ml-1.5 group-hover/toggle:max-w-24
                        group-hover/toggle:opacity-100
                      `}
                      >
                        {reasoningLevel !== "none" ? reasoningLevel : "Reasoning"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {["xhigh", "high", "medium", "low", "minimal", "none"].map(level => (
                      <DropdownMenuItem key={level} onClick={() => setReasoningLevel(level)}>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchEnabled(!searchEnabled)}
                  disabled={hasParallelApiKey === false}
                  className={cn(`
                    hover:text-foreground
                    group/toggle gap-0 overflow-hidden text-xs transition-all
                  `, searchEnabled
                    ? `
                      text-primary
                      hover:text-primary/80 hover:bg-primary/10
                    `
                    : `text-muted-foreground`)}
                >
                  <SearchIcon size={14} className="shrink-0" />
                  <span className={`
                    max-w-0 overflow-hidden whitespace-nowrap opacity-0
                    transition-all duration-200
                    group-hover/toggle:ml-1.5 group-hover/toggle:max-w-16
                    group-hover/toggle:opacity-100
                  `}
                  >
                    Search
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {hasParallelApiKey === false && !isParallelApiLoading
                    ? "Configure your Parallel API key in settings to use search"
                    : searchEnabled
                      ? "Search is enabled"
                      : "Search is disabled"}
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
                  className={cn(`
                    text-muted-foreground group/toggle gap-0 overflow-hidden
                    text-xs transition-all
                    hover:text-foreground
                  `, allAttachments.length > 0 && "text-primary")}
                >
                  <PaperclipIcon size={14} className="shrink-0" />
                  <span className={`
                    max-w-0 overflow-hidden whitespace-nowrap opacity-0
                    transition-all duration-200
                    group-hover/toggle:ml-1.5 group-hover/toggle:max-w-16
                    group-hover/toggle:opacity-100
                  `}
                  >
                    Attach
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach files</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-muted-foreground gap-1.5 text-xs"
          >
            <XIcon size={14} />
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={!canSend()}
            className="gap-1.5"
          >
            <SendIcon size={14} />
          </Button>
        </div>
      </div>
    </form>
  );
}
