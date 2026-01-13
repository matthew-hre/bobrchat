/* eslint-disable react-dom/no-dangerously-set-innerhtml */
"use client";

import type { FC } from "react";

import { Check, Copy, Download, WrapText } from "lucide-react";
import { useTheme } from "next-themes";
import { memo, useEffect, useState } from "react";
import { createHighlighter } from "shiki";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type CodeBlockProps = {
  language: string;
  value: string;
};

// Initialize highlighter once and cache across HMR/dev on `globalThis`
// to avoid creating multiple Shiki instances (see Shiki docs: cache highlighter).
const __SHIKI_GLOBAL_KEY = "__bobrchat_shiki_highlighter_promise";

const highlighterPromise: Promise<any> = (globalThis as any)[__SHIKI_GLOBAL_KEY] ?? (
  (globalThis as any)[__SHIKI_GLOBAL_KEY] = createHighlighter({
    themes: ["github-dark-dimmed", "github-light"],
    langs: [
      "javascript",
      "typescript",
      "tsx",
      "jsx",
      "json",
      "css",
      "html",
      "python",
      "bash",
      "sql",
      "markdown",
      "yaml",
      "go",
      "rust",
      "c",
      "cpp",
      "java",
      "csharp",
      "php",
      "ruby",
      "swift",
      "kotlin",
      "dart",
      "r",
      "dockerfile",
      "makefile",
      "plaintext",
      "nix",
      "ocaml",
    ],
  })
);

export const CodeBlock: FC<CodeBlockProps> = memo(({ language: propLanguage, value }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  // Clean up language string
  const language = (propLanguage || "text").trim().toLowerCase();

  useEffect(() => {
    let mounted = true;

    const highlight = async () => {
      try {
        const highlighter = await highlighterPromise;
        if (!mounted)
          return;

        const theme = resolvedTheme === "dark" ? "github-dark-dimmed" : "github-light";

        try {
          const html = highlighter.codeToHtml(value, {
            lang: language,
            theme,
          });
          setHighlightedCode(html);
        }
        catch {
          // Fallback to text if language specific highlighter fails (e.g. language not loaded)
          const html = highlighter.codeToHtml(value, {
            lang: "text",
            theme,
          });
          setHighlightedCode(html);
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

  const copyToClipboard = async () => {
    if (!value)
      return;
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadFile = async () => {
    if (!value)
      return;

    try {
      // @ts-expect-error - File System Access API is not yet in all type definitions
      if (typeof window.showSaveFilePicker === "function") {
        // @ts-expect-error - File System Access API
        const handle = await window.showSaveFilePicker({
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
        // User cancelled, do nothing
        return;
      }
    }

    // Fallback
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
