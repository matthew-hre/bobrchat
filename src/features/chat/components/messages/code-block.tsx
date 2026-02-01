"use client";

import type { FC } from "react";

import { Check, Copy, Download, WrapText } from "lucide-react";
import Prism from "prismjs";
import { memo, useMemo, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { useCopyToClipboard } from "~/lib/hooks";
import { cn } from "~/lib/utils";

// Core languages (no dependencies)
import "prismjs/components/prism-c";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-markup";
// Languages with dependencies - order matters
import "prismjs/components/prism-markup-templating"; // Required by PHP, etc.
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-php";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-r";
import "prismjs/components/prism-docker";
import "prismjs/components/prism-makefile";
import "prismjs/components/prism-nix";
import "prismjs/components/prism-ocaml";
import "prismjs/components/prism-haskell";
import "prismjs/components/prism-elixir";
import "prismjs/components/prism-erlang";
import "prismjs/components/prism-scala";
import "prismjs/components/prism-clojure";
import "prismjs/components/prism-perl";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-ini";
import "prismjs/components/prism-graphql";
import "prismjs/components/prism-regex";
import "prismjs/components/prism-zig";

type CodeBlockProps = {
  language: string;
  value: string;
};

export const CodeBlock: FC<CodeBlockProps> = memo(({ language: propLanguage, value }) => {
  const { copied: isCopied, copy } = useCopyToClipboard({ resetDelay: 2000 });
  const [wrap, setWrap] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const language = (propLanguage || "plaintext").trim().toLowerCase();

  const highlightedHtml = useMemo(() => {
    const grammar = Prism.languages[language];
    if (grammar) {
      return Prism.highlight(value, grammar, language);
    }
    return null;
  }, [value, language]);

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
    a.download = `snippet.${language === "plaintext" ? "txt" : language}`;
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
              : "text-muted-foreground")}
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
      <div className="prism-code overflow-x-auto p-4 font-mono text-xs">
        <pre className={cn(
          wrap
            ? "wrap-break-word whitespace-pre-wrap"
            : "overflow-x-auto whitespace-pre",
        )}
        >
          {highlightedHtml
            ? (
                <code
                  ref={codeRef}
                  className={`
                    language-${language}
                  `}
                  // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
              )
            : (
                <code
                  ref={codeRef}
                  className={`
                    language-${language}
                  `}
                >
                  {value}
                </code>
              )}
        </pre>
      </div>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";
