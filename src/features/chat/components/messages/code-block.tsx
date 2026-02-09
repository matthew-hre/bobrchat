"use client";

import type { FC } from "react";

import { memo, useState } from "react";

import { CodeToolbar } from "~/components/code/code-toolbar";
import { HighlightedCode } from "~/components/code/highlighted-code";
import { normalizeLanguage } from "~/lib/syntax/languages";

type CodeBlockProps = {
  language: string;
  value: string;
};

export const CodeBlock: FC<CodeBlockProps> = memo(({ language: propLanguage, value }) => {
  const [wrap, setWrap] = useState(false);

  const language = normalizeLanguage(propLanguage);

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
        <CodeToolbar
          code={value}
          language={language}
          wrap={wrap}
          onToggleWrap={() => setWrap(!wrap)}
          className={`
            opacity-0 transition-opacity
            group-hover/code-block:opacity-100
          `}
        />
      </div>
      <HighlightedCode code={value} language={language} wrap={wrap} />
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";
