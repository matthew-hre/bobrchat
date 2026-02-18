/* eslint-disable react/no-array-index-key */
"use client";

import { FileIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { AttachmentPreviewDialog } from "./attachment-preview-dialog";

export type PendingFile = {
  id: string;
  filename: string;
  mediaType: string;
  url: string;
  storagePath?: string;
  isUploading?: boolean;
};

type FilePreviewProps = {
  files: PendingFile[];
  onRemoveAction: (id: string) => void;
  className?: string;
  supportsNativePdf?: boolean;
};

export function FilePreview({ files, onRemoveAction, className, supportsNativePdf = true }: FilePreviewProps) {
  const [previewFile, setPreviewFile] = useState<PendingFile | null>(null);

  if (files.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {files.map(file => (
          <FilePreviewItem
            key={file.id}
            file={file}
            onRemove={() => onRemoveAction(file.id)}
            onPreview={() => setPreviewFile(file)}
            supportsNativePdf={supportsNativePdf}
          />
        ))}
      </div>
      <AttachmentPreviewDialog
        file={previewFile}
        open={previewFile !== null}
        onOpenChange={open => !open && setPreviewFile(null)}
      />
    </>
  );
}

function FilePreviewItem({
  file,
  onRemove,
  onPreview,
  supportsNativePdf,
}: {
  file: PendingFile;
  onRemove: () => void;
  onPreview: () => void;
  supportsNativePdf: boolean;
}) {
  const isImage = file.mediaType.startsWith("image/");
  const isPdf = file.mediaType === "application/pdf";
  const isTextFile = file.mediaType === "text/plain";
  const willBeProcessedByOpenRouter = isPdf && !supportsNativePdf;

  // Extract language from filename if it's a code file
  let language = "";
  if (isTextFile && file.filename) {
    const match = file.filename.match(/\.([a-z]+)$/i);
    if (match) {
      language = match[1].toLowerCase();
    }
  }

  return (
    <div
      role="button"
      tabIndex={file.isUploading ? -1 : 0}
      onClick={file.isUploading ? undefined : onPreview}
      onKeyDown={(e) => {
        if (!file.isUploading && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onPreview();
        }
      }}
      className={cn(`
        border-border bg-muted/50 group relative flex items-center gap-2 border
        p-2 pr-8 text-left
        hover:bg-muted/80
      `, file.isUploading ? "opacity-50" : "cursor-pointer")}
    >
      {isImage
        ? (
            <div className="relative size-10 overflow-hidden rounded">
              <Image
                src={file.url}
                alt={file.filename}
                width={32}
                height={32}
                className="size-full object-cover"
                unoptimized
              />
            </div>
          )
        : (
            <div
              className={`
                bg-muted flex size-10 items-center justify-center rounded
              `}
            >
              <FileIcon className="text-muted-foreground size-5" />
            </div>
          )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.filename}</p>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs">
            {isImage ? "Image" : file.mediaType.split("/")[1]?.toUpperCase() || "File"}
          </p>
          {isTextFile && language && (
            <span className={`
              bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs
            `}
            >
              {language.toUpperCase()}
            </span>
          )}
          {willBeProcessedByOpenRouter && (
            <span
              className={`
                bg-warning/10 text-warning rounded px-1.5 py-0.5 text-xs
              `}
              title="PDF will be processed by OpenRouter"
            >
              via OpenRouter
            </span>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={file.isUploading}
        className={`
          absolute top-1 right-1 size-6 opacity-0
          group-hover:opacity-100
        `}
      >
        <XIcon className="size-3" />
      </Button>

      {file.isUploading && (
        <div
          className={`
            bg-background/80 absolute inset-0 flex items-center justify-center
          `}
        >
          <div
            className={`
              border-primary size-4 animate-spin rounded-full border-2
              border-t-transparent
            `}
          />
        </div>
      )}
    </div>
  );
}

type MessageAttachment = { url: string; filename?: string; mediaType?: string };

export function MessageAttachments({
  attachments,
  className,
  showContent = true,
}: {
  attachments: MessageAttachment[];
  className?: string;
  showContent?: boolean;
}) {
  const [previewFile, setPreviewFile] = useState<MessageAttachment | null>(null);

  if (attachments.length === 0) {
    return null;
  }

  const images = attachments.filter(a => a.mediaType?.startsWith("image/"));
  const files = attachments.filter(a => !a.mediaType?.startsWith("image/"));

  const getFileTypeLabel = (mediaType?: string) => {
    if (!mediaType)
      return "File";
    if (mediaType.startsWith("image/")) {
      return mediaType.split("/")[1]?.toUpperCase() || "Image";
    }
    return mediaType.split("/")[1]?.toUpperCase() || "File";
  };

  const getLanguageLabel = (filename?: string) => {
    if (!filename)
      return null;
    const match = filename.match(/\.([a-z]+)$/i);
    return match ? match[1].toUpperCase() : null;
  };

  const previewable = previewFile
    ? { url: previewFile.url, filename: previewFile.filename ?? "File", mediaType: previewFile.mediaType ?? "application/octet-stream" }
    : null;

  if (!showContent) {
    return (
      <div className={cn("mt-2 space-y-2 pb-2", className)}>
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, idx) => {
            const isImage = attachment.mediaType?.startsWith("image/");
            const langLabel = getLanguageLabel(attachment.filename);
            return (
              <button
                type="button"
                key={idx}
                onClick={() => setPreviewFile(attachment)}
                className={`
                  border-card flex cursor-pointer items-center gap-2 rounded-md
                  border p-2 shadow
                  hover:bg-card/10
                `}
              >
                <FileIcon className="size-4" />
                <span className="text-sm">{attachment.filename || (isImage ? "Image" : "File")}</span>
                {langLabel
                  ? (
                      <span className={`
                        bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs
                      `}
                      >
                        {langLabel}
                      </span>
                    )
                  : (
                      <span className={`
                        bg-muted text-muted-foreground rounded px-1.5 py-0.5
                        text-xs
                      `}
                      >
                        {getFileTypeLabel(attachment.mediaType)}
                      </span>
                    )}
              </button>
            );
          })}
        </div>
        <AttachmentPreviewDialog
          file={previewable}
          open={previewFile !== null}
          onOpenChange={open => !open && setPreviewFile(null)}
        />
      </div>
    );
  }

  return (
    <div className={cn("mt-2 space-y-2 pb-2", className)}>
      {images.length > 1
        ? (
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setPreviewFile(img)}
                  className={`
                    hover:bg-card/10
                    border-card flex cursor-pointer items-center gap-2
                    rounded-md border p-2 shadow transition-colors
                  `}
                >
                  <Image
                    src={img.url}
                    alt={img.filename || "Attached image"}
                    width={32}
                    height={32}
                    className="aspect-square max-h-8 max-w-xs object-cover"
                    unoptimized
                  />
                  <span className="text-sm">{img.filename || "Attached image"}</span>
                </button>
              ))}
            </div>
          )
        : images.length === 1
          ? (
              <div className="flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setPreviewFile(img)}
                    className="block cursor-pointer overflow-hidden rounded-lg"
                  >
                    <Image
                      src={img.url}
                      alt={img.filename || "Attached image"}
                      width={256}
                      height={256}
                      className="w-full max-w-xs object-contain"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )
          : null}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, idx) => {
            const langLabel = getLanguageLabel(file.filename);
            return (
              <button
                type="button"
                key={idx}
                onClick={() => setPreviewFile(file)}
                className={`
                  hover:bg-card/10
                  border-card flex cursor-pointer items-center gap-2 rounded-md
                  border p-2 shadow transition-colors
                `}
              >
                <FileIcon className="text-card size-4" />
                <span className="text-sm">{file.filename || "File"}</span>
                {langLabel && (
                  <span className={`
                    bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs
                  `}
                  >
                    {langLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <AttachmentPreviewDialog
        file={previewable}
        open={previewFile !== null}
        onOpenChange={open => !open && setPreviewFile(null)}
      />
    </div>
  );
}
