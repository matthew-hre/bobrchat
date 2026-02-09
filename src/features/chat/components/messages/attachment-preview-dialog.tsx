"use client";

import { FileIcon, Loader2, XIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { CodeToolbar } from "~/components/code/code-toolbar";
import { HighlightedCode } from "~/components/code/highlighted-code";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { getLanguageFromFilename } from "~/lib/syntax/languages";
import { cn } from "~/lib/utils";

type PreviewableFile = {
  url: string;
  filename: string;
  mediaType: string;
};

type AttachmentPreviewDialogProps = {
  file: PreviewableFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function extractAttachmentId(url: string): string | null {
  const match = url.match(/uploads\/([a-f0-9-]+)\./);
  return match ? match[1] : null;
}

function useFileContent(url: string) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setContent(null);
    setError(false);

    let fetchUrl = url;
    if (!url.startsWith("blob:")) {
      const id = extractAttachmentId(url);
      if (id) {
        fetchUrl = `/api/attachments/content?id=${encodeURIComponent(id)}`;
      }
    }

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok)
          throw new Error("Failed to fetch");
        return res.text();
      })
      .then(setContent)
      .catch(() => setError(true));
  }, [url]);

  return { content, error };
}

function TextPreviewHeader({
  filename,
  onClose,
  children,
}: {
  filename: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`
      border-border bg-muted/50 flex items-center justify-between border-b
      px-4 py-2
    `}
    >
      <span className="text-muted-foreground truncate text-xs font-medium">
        {filename}
      </span>
      {children ?? (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          title="Close"
        >
          <XIcon className="text-muted-foreground h-3.5 w-3.5" />
          <span className="sr-only">Close</span>
        </Button>
      )}
    </div>
  );
}

function TextPreview({
  url,
  filename,
  onClose,
}: {
  url: string;
  filename: string;
  onClose: () => void;
}) {
  const { content, error } = useFileContent(url);
  const [wrap, setWrap] = useState(false);

  const language = getLanguageFromFilename(filename);

  if (error) {
    return (
      <div className={`
        bg-background border-border w-full overflow-hidden rounded-lg border
      `}
      >
        <TextPreviewHeader filename={filename} onClose={onClose} />
        <div className={`
          text-muted-foreground flex items-center justify-center py-8 text-sm
        `}
        >
          Failed to load file contents.
        </div>
      </div>
    );
  }

  if (content === null) {
    return (
      <div className={`
        bg-background border-border w-full overflow-hidden rounded-lg border
      `}
      >
        <TextPreviewHeader filename={filename} onClose={onClose} />
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`
      bg-background border-border group/code-block w-full overflow-hidden
      rounded-lg border
    `}
    >
      <TextPreviewHeader filename={filename} onClose={onClose}>
        <CodeToolbar
          code={content}
          filename={filename}
          language={language}
          wrap={wrap}
          onToggleWrap={() => setWrap(!wrap)}
          onClose={onClose}
        />
      </TextPreviewHeader>
      <HighlightedCode
        code={content}
        language={language}
        wrap={wrap}
        className="max-h-[70vh] overflow-auto"
      />
    </div>
  );
}

function ImagePreview({ url, filename }: { url: string; filename: string }) {
  return (
    <div className="flex items-center justify-center">
      <Image
        src={url}
        alt={filename}
        width={800}
        height={800}
        className="max-h-[70vh] w-auto rounded object-contain"
        unoptimized
      />
    </div>
  );
}

function PdfPreview({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      title="PDF preview"
      className="h-[70vh] w-full rounded border-0"
    />
  );
}

function GenericPreview({ filename, mediaType }: { filename: string; mediaType: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <FileIcon className="text-muted-foreground size-10" />
      <p className="text-muted-foreground text-sm">
        Preview not available for
        {" "}
        {mediaType.split("/")[1]?.toUpperCase() || "this file type"}
      </p>
      <p className="text-muted-foreground text-xs">{filename}</p>
    </div>
  );
}

export function AttachmentPreviewDialog({ file, open, onOpenChange }: AttachmentPreviewDialogProps) {
  if (!file)
    return null;

  const isImage = file.mediaType.startsWith("image/");
  const isPdf = file.mediaType === "application/pdf";
  const isText = file.mediaType === "text/plain" || file.mediaType.startsWith("text/");

  if (isText) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={`
            gap-0 overflow-hidden border-0 p-0
            sm:max-w-2xl
          `}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{file.filename}</DialogTitle>
            <DialogDescription>File preview</DialogDescription>
          </DialogHeader>
          <TextPreview
            url={file.url}
            filename={file.filename}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto",
          (isImage || isPdf) ? "sm:max-w-3xl" : "sm:max-w-2xl",
        )}
      >
        <DialogHeader>
          <DialogTitle className="truncate">{file.filename}</DialogTitle>
          <DialogDescription>
            {isImage ? "Image" : file.mediaType.split("/")[1]?.toUpperCase() || "File"}
          </DialogDescription>
        </DialogHeader>

        {isImage && <ImagePreview url={file.url} filename={file.filename} />}
        {isPdf && <PdfPreview url={file.url} />}
        {!isImage && !isPdf && <GenericPreview filename={file.filename} mediaType={file.mediaType} />}
      </DialogContent>
    </Dialog>
  );
}
