"use client";

import { Check, Copy, Download, WrapText, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCopyToClipboard } from "~/lib/hooks";
import { cn } from "~/lib/utils";

type CodeToolbarProps = {
  code: string;
  filename?: string;
  language?: string;
  wrap: boolean;
  onToggleWrap: () => void;
  onClose?: () => void;
  className?: string;
};

async function downloadCode(code: string, filename: string) {
  try {
    if ("showSaveFilePicker" in window) {
      const ext = filename.split(".").pop() || "txt";
      const handle = await (window as Window & { showSaveFilePicker: (options: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: "Code Snippet",
          accept: { "text/plain": [".txt", `.${ext}`] },
        }],
      });

      const writable = await handle.createWritable();
      await writable.write(code);
      await writable.close();
      return;
    }
  }
  catch (err: unknown) {
    if (err instanceof Error && err.name !== "AbortError") {
      console.error("Failed to save file:", err);
    }
    else {
      return;
    }
  }

  const blob = new Blob([code], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CodeToolbar({
  code,
  filename,
  language,
  wrap,
  onToggleWrap,
  onClose,
  className,
}: CodeToolbarProps) {
  const { copied: isCopied, copy } = useCopyToClipboard({ resetDelay: 2000 });

  const downloadFilename = filename ?? `snippet.${language === "plaintext" ? "txt" : language ?? "txt"}`;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleWrap} title="Toggle wrap">
        <WrapText className={cn("h-3.5 w-3.5", wrap ? "text-foreground" : "text-muted-foreground")} />
        <span className="sr-only">Toggle line wrap</span>
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadCode(code, downloadFilename)} title="Download">
        <Download className="text-muted-foreground h-3.5 w-3.5" />
        <span className="sr-only">Download</span>
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(code)} title="Copy">
        {isCopied
          ? <Check className="text-primary h-3.5 w-3.5" />
          : <Copy className="text-muted-foreground h-3.5 w-3.5" />}
        <span className="sr-only">Copy code</span>
      </Button>
      {onClose && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <XIcon className="text-muted-foreground h-3.5 w-3.5" />
          <span className="sr-only">Close</span>
        </Button>
      )}
    </div>
  );
}
