import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import type { PendingFile } from "~/features/chat/components/messages/file-preview";
import type { getModelCapabilities } from "~/features/models";

import { useGlobalDropZone } from "~/features/attachments/components/global-drop-zone";
import { STORAGE_QUOTA_KEY } from "~/features/attachments/hooks/use-attachments";
import { useChatUIStore } from "~/features/chat/store";
import { detectLanguage, getLanguageExtension } from "~/features/chat/utils/detect-language";
import { validateFilesForModel } from "~/features/models";

const PASTE_TEXT_THRESHOLD = 2000;
const PASTE_LINE_THRESHOLD = 25;

type UseFileAttachmentsProps = {
  capabilities: ReturnType<typeof getModelCapabilities>;
  onValueChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  autoCreateFilesFromPaste?: boolean;
  localPendingFiles?: {
    files: PendingFile[];
    setFiles: (next: PendingFile[] | ((prev: PendingFile[]) => PendingFile[])) => void;
    clear: () => void;
  };
};

export function useFileAttachments({
  capabilities,
  autoCreateFilesFromPaste = true,
  localPendingFiles,
}: UseFileAttachmentsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const globalPendingFiles = useChatUIStore(s => s.pendingFiles);
  const globalSetPendingFiles = useChatUIStore(s => s.setPendingFiles);
  const globalClearPendingFiles = useChatUIStore(s => s.clearPendingFiles);

  const pendingFiles = localPendingFiles ? localPendingFiles.files : globalPendingFiles;
  const setPendingFiles = localPendingFiles ? localPendingFiles.setFiles : globalSetPendingFiles;
  const storeClearPendingFiles = localPendingFiles ? localPendingFiles.clear : globalClearPendingFiles;

  const uploadFiles = React.useCallback(
    async (filesToUpload: FileList | File[]) => {
      const files = Array.from(filesToUpload);
      if (files.length === 0) {
        return;
      }

      const { valid, invalid } = validateFilesForModel(files, capabilities);

      if (invalid.length > 0) {
        for (const { file, reason } of invalid) {
          toast.error(`${file.name}: ${reason}`);
        }
      }

      if (valid.length === 0) {
        return;
      }

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
      tempFiles.forEach(tf => formData.append("clientIds", tf.id));

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

        if (result.errors?.length > 0) {
          console.error("[uploadFiles] server returned errors:", result.errors);
          for (const err of result.errors) {
            toast.error(`${err.filename}: ${err.error}`);
          }
        }

        if (result.files.length === 0) {
          throw new Error(result.errors?.[0]?.error || "No files uploaded");
        }

        setPendingFiles((prev) => {
          const updated = [...prev];
          result.files.forEach((uploaded: PendingFile & { clientId?: string }) => {
            const tempFile = uploaded.clientId
              ? tempFiles.find(tf => tf.id === uploaded.clientId)
              : tempFiles[result.files.indexOf(uploaded)];
            if (!tempFile)
              return;
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
          setPendingFiles((prev) => {
            for (const tf of tempFiles) {
              const file = prev.find(f => f.id === tf.id);
              if (file?.url.startsWith("blob:")) {
                URL.revokeObjectURL(file.url);
              }
            }
            return prev.filter(f => !tempFiles.some(tf => tf.id === f.id));
          });
          if (err instanceof Error && err.message.includes("quota")) {
            return err.message;
          }
          return `Failed to upload ${fileLabel}`;
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) {
        return;
      }

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
      if (hasText) {
        const text = e.clipboardData.getData("text/plain");
        if (!text)
          return;

        let lineCount = 1;
        for (let i = 0; i < text.length && lineCount <= PASTE_LINE_THRESHOLD; i++) {
          if (text[i] === "\n")
            lineCount++;
        }
        const isLongText
          = text.length > PASTE_TEXT_THRESHOLD
            || lineCount > PASTE_LINE_THRESHOLD;

        if (isLongText && autoCreateFilesFromPaste) {
          e.preventDefault();
          const language = detectLanguage(text);
          const extension = getLanguageExtension(language);
          const filename = `pasted-${Date.now()}.${extension}`;
          const file = new File([text], filename, { type: "text/plain" });
          uploadFiles([file]);
        }
        // Short text: let the browser handle it natively (preserves undo stack)
      }
    },
    [uploadFiles, capabilities, autoCreateFilesFromPaste],
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

  // Register with global drop zone for app-wide drag-and-drop
  const globalDropHandler = React.useCallback(
    (files: FileList) => {
      if (capabilities.supportsImages) {
        uploadFiles(files);
      }
    },
    [uploadFiles, capabilities.supportsImages],
  );
  const isGlobalDragging = useGlobalDropZone(globalDropHandler);

  const [isDragging, setIsDragging] = React.useState(false);
  const dragCounterRef = React.useRef(0);

  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0 && capabilities.supportsImages) {
        uploadFiles(files);
      }
    },
    [uploadFiles, capabilities.supportsImages],
  );

  const clearPendingFiles = storeClearPendingFiles;

  return {
    pendingFiles,
    fileInputRef,
    isUploading,
    isDragging: isDragging || isGlobalDragging,
    handleRemoveFile,
    handlePaste,
    handleAttachClick,
    handleFileInputChange,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    clearPendingFiles,
  };
}
