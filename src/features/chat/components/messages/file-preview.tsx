/* eslint-disable react/no-array-index-key */
"use client";

import { FileIcon, XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

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
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {files.map(file => (
        <FilePreviewItem
          key={file.id}
          file={file}
          onRemove={() => onRemoveAction(file.id)}
          supportsNativePdf={supportsNativePdf}
        />
      ))}
    </div>
  );
}

function FilePreviewItem({
  file,
  onRemove,
  supportsNativePdf,
}: {
  file: PendingFile;
  onRemove: () => void;
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
      className={cn(`
        border-border bg-muted/50 group relative flex items-center gap-2 border
        p-2 pr-8
      `, file.isUploading && "opacity-50")}
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
                rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-600
                dark:text-amber-400
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
        onClick={onRemove}
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

export function MessageAttachments({
  attachments,
  className,
  showContent = true,
}: {
  attachments: Array<{ url: string; filename?: string; mediaType?: string }>;
  className?: string;
  showContent?: boolean;
}) {
  if (attachments.length === 0) {
    return null;
  }

  const images = attachments.filter(a => a.mediaType?.startsWith("image/"));
  const files = attachments.filter(a => !a.mediaType?.startsWith("image/"));

  const getFileTypeLabel = (mediaType?: string) => {
    if (!mediaType) return "File";
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

  if (!showContent) {
    return (
      <div className={cn("mt-2 space-y-2 pb-2", className)}>
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, idx) => {
            const isImage = attachment.mediaType?.startsWith("image/");
            const langLabel = getLanguageLabel(attachment.filename);
            return (
              <div
                key={idx}
                className={`
                  border-card flex items-center gap-2 rounded-md border p-2
                  shadow
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
                        bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs
                      `}
                      >
                        {getFileTypeLabel(attachment.mediaType)}
                      </span>
                    )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mt-2 space-y-2 pb-2", className)}>
      {images.length > 1
        ? (
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <Link
                  key={idx}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    hover:bg-card/10
                    border-card flex items-center gap-2 rounded-md border p-2
                    shadow transition-colors
                  `}
                >
                  <Image
                    src={img.url}
                    alt={img.filename || "Attached image"}
                    width={32}
                    height={32}
                    className="aspect-square max-h-8 max-w-xs object-cover"
                  />
                  <span className="text-sm">{img.filename || "Attached image"}</span>
                </Link>
              ))}
            </div>
          )
        : images.length === 1
          ? (
              <div className="flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <Link
                    key={idx}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg"
                  >
                    <Image
                      src={img.url}
                      alt={img.filename || "Attached image"}
                      width={256}
                      height={256}
                      className="w-full max-w-xs object-contain"
                    />
                  </Link>
                ))}
              </div>
            )
          : null}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, idx) => {
            const langLabel = getLanguageLabel(file.filename);
            return (
              <Link
                key={idx}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  hover:bg-card/10
                  border-card flex items-center gap-2 rounded-md border p-2
                  shadow transition-colors
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
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
