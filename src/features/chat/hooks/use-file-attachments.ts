import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import type { PendingFile } from "~/features/chat/components/messages/file-preview";
import type { getModelCapabilities } from "~/features/models";

import { STORAGE_QUOTA_KEY } from "~/features/attachments/hooks/use-attachments";
import { detectLanguage, getLanguageExtension } from "~/features/chat/utils/detect-language";
import { validateFilesForModel } from "~/features/models";

const PASTE_TEXT_THRESHOLD = 2000;
const PASTE_LINE_THRESHOLD = 25;

type UseFileAttachmentsProps = {
  capabilities: ReturnType<typeof getModelCapabilities>;
  onValueChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function useFileAttachments({
  capabilities,
  onValueChange,
  textareaRef,
}: UseFileAttachmentsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = React.useState<PendingFile[]>([]);

  const uploadFiles = React.useCallback(
    async (filesToUpload: FileList | File[]) => {
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

      const fileLabel
        = valid.length === 1 ? valid[0].name : `${valid.length} files`;

      const uploadPromise = async () => {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.code === "QUOTA_EXCEEDED") {
            throw new Error(errorData.error || "Storage quota exceeded");
          }
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

        queryClient.invalidateQueries({ queryKey: STORAGE_QUOTA_KEY });
        return result;
      };

      toast.promise(uploadPromise(), {
        loading: `Uploading ${fileLabel}...`,
        success: `Uploaded ${fileLabel}`,
        error: (err) => {
          setPendingFiles(prev =>
            prev.filter(f => !tempFiles.some(tf => tf.id === f.id)),
          );
          if (err instanceof Error && err.message.includes("quota")) {
            return err.message;
          }
          return `Failed to upload ${fileLabel}`;
        },
      });
    },
    [capabilities, queryClient],
  );

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

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent) => {
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
      if (files.length > 0 && capabilities.supportsImages) {
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
              const isLongText
                = text.length > PASTE_TEXT_THRESHOLD
                  || lineCount > PASTE_LINE_THRESHOLD;

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
                // For short text, insert directly
                const textarea = textareaRef.current;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const currentValue = textarea.value;
                  const newValue
                    = currentValue.slice(0, start)
                      + text
                      + currentValue.slice(end);
                  onValueChange(newValue);

                  // Move cursor after inserted text
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd
                      = start + text.length;
                  }, 0);
                }
              }
            });
          }
        }
      }
    },
    [uploadFiles, onValueChange, capabilities, textareaRef],
  );

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

  const isUploading = pendingFiles.some(f => f.isUploading);

  const clearPendingFiles = React.useCallback(() => {
    setPendingFiles([]);
  }, []);

  return {
    pendingFiles,
    fileInputRef,
    isUploading,
    handleRemoveFile,
    handlePaste,
    handleAttachClick,
    handleFileInputChange,
    clearPendingFiles,
  };
}
