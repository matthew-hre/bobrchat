"use client";

import { createMathPlugin } from "@streamdown/math";
import { memo } from "react";
import { Streamdown } from "streamdown";

import { CodeBlock } from "~/features/chat/components/messages/code-block";
import { cn } from "~/lib/utils";

const math = createMathPlugin({
  singleDollarTextMath: true,
});

const components = {
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const match = /language-(\w+)/.exec(className || "");
    return (
      <CodeBlock
        language={match ? match[1] : "plaintext"}
        value={String(children).replace(/\n$/, "")}
      />
    );
  },
  inlineCode: ({ children }: { children?: React.ReactNode }) => (
    <code
      className={cn(
        "bg-muted rounded px-1.5 py-0.5 font-mono text-xs",
      )}
    >
      {children}
    </code>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
};

export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    return (
      <Streamdown
        key={id}
        components={components}
        plugins={{ math }}
      >
        {content}
      </Streamdown>
    );
  },
);

MemoizedMarkdown.displayName = "MemoizedMarkdown";
