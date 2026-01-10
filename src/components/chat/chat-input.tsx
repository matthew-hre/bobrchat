"use client";

import { AlertCircle, PaperclipIcon, SearchIcon, SendIcon, SquareIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import type { PendingFile } from "~/components/chat/file-preview";

import { FilePreview } from "~/components/chat/file-preview";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { useFavoriteModels, useModels } from "~/lib/queries/use-models";
import { useChatUIStore } from "~/lib/stores/chat-ui-store";
import { cn } from "~/lib/utils";
import { detectLanguage, getLanguageExtension } from "~/lib/utils/detect-language";
import { canUploadFiles, getAcceptedFileTypes, getModelCapabilities, validateFilesForModel } from "~/lib/utils/model-capabilities";

import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ModelSelector } from "./model-selector";

type ChatInputProps = {
  className?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSendMessage: (content: string, files?: PendingFile[]) => void;
  isLoading?: boolean;
  onStop?: () => void;
  searchEnabled?: boolean;
  onSearchChange?: (enabled: boolean) => void;
};

const PASTE_TEXT_THRESHOLD = 2000;
const PASTE_LINE_THRESHOLD = 25;

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
  onSearchChange,
}: ChatInputProps) {
  const { data: settings } = useUserSettings();
  const hasOpenRouterKey = settings?.configuredApiKeys?.openrouter;

  const favoriteModels = useFavoriteModels();
  const { isLoading: isModelsLoading } = useModels({ enabled: hasOpenRouterKey });
  const { selectedModelId, setSelectedModelId } = useChatUIStore();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [pendingFiles, setPendingFiles] = React.useState<PendingFile[]>([]);

  const selectedModel = favoriteModels.find(m => m.id === selectedModelId);
  const capabilities = getModelCapabilities(selectedModel);
  const canUpload = canUploadFiles(capabilities);
  const acceptedTypes = getAcceptedFileTypes(capabilities);

  const uploadFiles = React.useCallback(async (filesToUpload: FileList | File[]) => {
    const files = Array.from(filesToUpload);
    if (files.length === 0)
      return;

    const { valid, invalid } = validateFilesForModel(files, capabilities);

    if (invalid.length > 0) {
      for (const { file, reason } of invalid) {
        toast.error(`${file.name}: ${reason}`);
      }
    }

    if (valid.length === 0)
      return;

    const tempFiles: PendingFile[] = valid.map(file => ({
      id: crypto.randomUUID(),
      filename: file.name,
      mediaType: file.type,
      url: URL.createObjectURL(file),
      isUploading: true,
    }));

    setPendingFiles(prev => [...prev, ...tempFiles]);

    const formData = new FormData();
    valid.forEach(file => formData.append("files", file));

    const fileLabel = valid.length === 1 ? valid[0].name : `${valid.length} files`;

    const uploadPromise = async () => {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      setPendingFiles((prev) => {
        const updated = [...prev];
        result.files.forEach((uploaded: PendingFile, index: number) => {
          const tempFile = tempFiles[index];
          const existingIndex = updated.findIndex(f => f.id === tempFile.id);
          if (existingIndex !== -1) {
            URL.revokeObjectURL(updated[existingIndex].url);
            updated[existingIndex] = {
              ...uploaded,
              isUploading: false,
            };
          }
        });
        return updated;
      });

      return result;
    };

    toast.promise(uploadPromise(), {
      loading: `Uploading ${fileLabel}...`,
      success: `Uploaded ${fileLabel}`,
      error: () => {
        setPendingFiles(prev =>
          prev.filter(f => !tempFiles.some(tf => tf.id === f.id)),
        );
        return `Failed to upload ${fileLabel}`;
      },
    });
  }, [capabilities]);

  const handleRemoveFile = React.useCallback((id: string) => {
    setPendingFiles((prev) => {
      const file = prev.find(f => f.id === id);
      if (file?.url.startsWith("blob:")) {
        URL.revokeObjectURL(file.url);
      }

      // If the file has been uploaded (has storagePath), delete it from the database
      if (file?.storagePath) {
        fetch("/api/attachments", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id] }),
        }).catch((error) => {
          console.error("Failed to delete attachment:", error);
          toast.error("Failed to delete attachment");
        });
      }

      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handlePaste = React.useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items)
      return;

    const files: File[] = [];
    let hasText = false;

    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file)
          files.push(file);
      }
      else if (item.kind === "string" && item.type === "text/plain") {
        hasText = true;
      }
    }

    // If we have files and model supports uploads, upload them
    if (files.length > 0 && canUpload) {
      e.preventDefault();
      uploadFiles(files);
      return;
    }

    // Check if pasted text is long and should be treated as a file
    // Only convert to file if the model supports file uploads
    if (hasText) {
      e.preventDefault();
      for (const item of items) {
        if (item.kind === "string" && item.type === "text/plain") {
          item.getAsString((text) => {
            const lineCount = text.split("\n").length;
            const isLongText = text.length > PASTE_TEXT_THRESHOLD || lineCount > PASTE_LINE_THRESHOLD;

            // Only convert to file if model supports files
            if (isLongText) {
              const language = detectLanguage(text);
              const extension = getLanguageExtension(language);
              const filename = `pasted-${Date.now()}.${extension}`;

              const file = new File([text], filename, {
                type: "text/plain",
              });

              uploadFiles([file]);
            }
            else {
              // For short text or when model doesn't support files, insert directly
              const textarea = textareaRef.current;
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const currentValue = textarea.value;
                const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
                onValueChange(newValue);

                // Move cursor after inserted text
                setTimeout(() => {
                  textarea.selectionStart = textarea.selectionEnd = start + text.length;
                }, 0);
              }
              else {
                onValueChange((value || "") + text);
              }
            }
          });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadFiles, onValueChange, canUpload, capabilities.supportsFiles]);

  const handleAttachClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) {
      onStop?.();
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
    setPendingFiles([]);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isUploading = pendingFiles.some(f => f.isUploading);

  return (
    <div className={cn(`bg-background p-4 pt-0`, className)}>
      <div className="mx-auto max-w-3xl space-y-3">
        {/* API Key Warning */}
        {hasOpenRouterKey === false && (
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
                href="?settings=integrations"
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

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={e => onValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type your message here..."
            disabled={hasOpenRouterKey === false}
            className={`
              max-h-50 min-h-13 resize-none rounded-none border-0 px-3 py-3
              text-base
              focus-visible:ring-0
              disabled:opacity-50
            `}
            rows={2}
          />

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
              isLoading={isModelsLoading}
            />

            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {capabilities.supportsSearch && (
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
                >
                  <SearchIcon size={16} />
                  Search
                </Button>
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
                disabled={isLoading ? !onStop : (!value.trim() && pendingFiles.length === 0) || isUploading}
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
