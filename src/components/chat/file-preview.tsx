/* eslint-disable react/no-array-index-key */
"use client";

import { FileIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export type PendingFile = {
  id: string;
  filename: string;
  mediaType: string;
  url: string;
  isUploading?: boolean;
};

type FilePreviewProps = {
  files: PendingFile[];
  onRemove: (id: string) => void;
  className?: string;
};

export function FilePreview({ files, onRemove, className }: FilePreviewProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {files.map(file => (
        <FilePreviewItem
          key={file.id}
          file={file}
          onRemove={() => onRemove(file.id)}
        />
      ))}
    </div>
  );
}

function FilePreviewItem({
  file,
  onRemove,
}: {
  file: PendingFile;
  onRemove: () => void;
}) {
  const isImage = file.mediaType.startsWith("image/");

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
              {/* eslint-disable-next-line next/no-img-element */}
              <img
                src={file.url}
                alt={file.filename}
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
        <p className="text-muted-foreground text-xs">
          {isImage ? "Image" : file.mediaType.split("/")[1]?.toUpperCase() || "File"}
        </p>
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
}: {
  attachments: Array<{ url: string; filename?: string; mediaType?: string }>;
  className?: string;
}) {
  if (attachments.length === 0) {
    return null;
  }

  const images = attachments.filter(a => a.mediaType?.startsWith("image/"));
  const files = attachments.filter(a => !a.mediaType?.startsWith("image/"));

  return (
    <div className={cn("mt-2 space-y-2 pb-2", className)}>
      {images.length > 1
        ? (
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <a
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
                  {/* eslint-disable-next-line next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.filename || "Attached image"}
                    className="aspect-square max-h-8 max-w-xs object-cover"
                  />
                  <span className="text-sm">{img.filename || "Attached image"}</span>
                </a>
              ))}
            </div>
          )
        : images.length === 1
          ? (
              <div className="flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <a
                    key={idx}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg"
                  >
                    {/* eslint-disable-next-line next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.filename || "Attached image"}
                      className="w-full max-w-xs object-contain"
                    />
                  </a>
                ))}
              </div>
            )
          : null}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, idx) => (
            <a
              key={idx}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                hover:bg-card/10
                border-card flex items-center gap-2 rounded-md border p-2 shadow
                transition-colors
              `}
            >
              <FileIcon className="text-card size-4" />
              <span className="text-sm">{file.filename || "File"}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
