"use client";

import type { FC } from "react";

import DOMPurify from "dompurify";
import { Check, Copy, Download, WrapText } from "lucide-react";
import { useTheme } from "next-themes";
import { memo, useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { useCopyToClipboard } from "~/lib/hooks";
import { cn } from "~/lib/utils";

type CodeBlockProps = {
  language: string;
  value: string;
};

export const CodeBlock: FC<CodeBlockProps> = memo(({ language: propLanguage, value }) => {
  const { copied: isCopied, copy } = useCopyToClipboard({ resetDelay: 2000 });
  const [wrap, setWrap] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  const language = (propLanguage || "text").trim().toLowerCase();

  useEffect(() => {
    let mounted = true;

    const highlight = async () => {
      try {
        const response = await fetch("/api/highlight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: value,
            language,
            theme: resolvedTheme,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to highlight");
        }

        const { html } = await response.json();
        if (mounted) {
          setHighlightedCode(DOMPurify.sanitize(html));
        }
      }
      catch (error) {
        console.error("Failed to highlight code:", error);
      }
    };

    highlight();

    return () => {
      mounted = false;
    };
  }, [value, language, resolvedTheme]);

  const copyToClipboard = () => {
    if (!value)
      return;
    copy(value);
  };

  const downloadFile = async () => {
    if (!value)
      return;

    try {
      if ("showSaveFilePicker" in window) {
        const handle = await (window as Window & { showSaveFilePicker: (options: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: `snippet.${language || "txt"}`,
          types: [{
            description: "Code Snippet",
            accept: { "text/plain": [".txt", `.${language || "txt"}`] },
          }],
        });

        const writable = await handle.createWritable();
        await writable.write(value);
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

    const blob = new Blob([value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snippet.${language === "text" ? "txt" : language}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`
      bg-background border-border group/code-block relative my-4 w-full
      overflow-hidden rounded-lg border
    `}
    >
      <div className={`
        border-border bg-muted/50 flex items-center justify-between border-b
        px-4 py-2
      `}
      >
        <span className="text-muted-foreground text-xs font-medium lowercase">{language}</span>
        <div className={`
          flex items-center gap-1 opacity-0 transition-opacity
          group-hover/code-block:opacity-100
        `}
        >
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setWrap(!wrap)} title="Toggle wrap">
            <WrapText className={cn("h-3.5 w-3.5", wrap
              ? "text-foreground"
              : `text-muted-foreground`)}
            />
            <span className="sr-only">Toggle line wrap</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={downloadFile} title="Download">
            <Download className="text-muted-foreground h-3.5 w-3.5" />
            <span className="sr-only">Download</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard} title="Copy">
            {isCopied
              ? (
                  <Check className="text-primary h-3.5 w-3.5" />
                )
              : (
                  <Copy className="text-muted-foreground h-3.5 w-3.5" />
                )}
            <span className="sr-only">Copy code</span>
          </Button>
        </div>
      </div>
      <div className="bg-background overflow-x-auto p-4 font-mono text-xs">
        {highlightedCode
          ? (
              <div
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
                className={cn(`
                  [&>pre]:m-0! [&>pre]:bg-transparent! [&>pre]:p-0!
                `, wrap
                  ? "[&>pre]:wrap-break-word [&>pre]:whitespace-pre-wrap"
                  : `[&>pre]:overflow-x-auto [&>pre]:whitespace-pre`)}
              />
            )
          : (
              <code className={cn("text-foreground block", wrap
                ? "wrap-break-word whitespace-pre-wrap"
                : "whitespace-pre")}
              >
                {value}
              </code>
            )}
      </div>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";
