/* eslint-disable react/no-array-index-key */
import Link from "next/link";
import { lazy, memo, Suspense, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "~/features/chat/components/messages/code-block";
import { cn } from "~/lib/utils";

const MathMarkdownBlock = lazy(() => import("./markdown-math-block"));

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const lines = markdown.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let inCodeFence = false;
  let fenceMarker = "";
  let inMath = false;

  function flush() {
    if (current.length > 0) {
      const block = current.join("\n").trim();
      if (block)
        blocks.push(block);
      current = [];
    }
  }

  for (const line of lines) {
    // Code fence toggle
    if (!inMath) {
      const fenceMatch = line.match(/^(`{3,}|~{3,})/);
      if (fenceMatch) {
        if (!inCodeFence) {
          flush();
          inCodeFence = true;
          fenceMarker = fenceMatch[1][0].repeat(fenceMatch[1].length);
          current.push(line);
          continue;
        }
        else if (line.startsWith(fenceMarker) && line.trim() === fenceMarker) {
          current.push(line);
          flush();
          inCodeFence = false;
          fenceMarker = "";
          continue;
        }
      }
    }

    if (inCodeFence) {
      current.push(line);
      continue;
    }

    // Math block toggle
    if (!inMath && line.trimStart().startsWith("$$")) {
      const afterOpen = line.trimStart().slice(2);
      if (afterOpen.trimEnd().endsWith("$$") && afterOpen.trimEnd().length > 2) {
        // Single-line display math: $$...$$
        flush();
        const inner = afterOpen.trimEnd().slice(0, -2).trim();
        blocks.push(`$$\n${inner}\n$$`);
        continue;
      }
      flush();
      inMath = true;
      current.push(line);
      continue;
    }

    if (inMath) {
      current.push(line);
      if (line.trimEnd().endsWith("$$")) {
        // Normalize: put $$ on own lines
        const raw = current.join("\n");
        const inner = raw.replace(/^\s*\$\$/, "").replace(/\$\$\s*$/, "").trim();
        blocks.push(`$$\n${inner}\n$$`);
        current = [];
        inMath = false;
      }
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      flush();
      continue;
    }

    current.push(line);
  }

  flush();
  return blocks.length > 0 ? blocks : [markdown];
}

const MATH_RE = /\$\$?/;

const markdownComponents = {
  code: ({ className, children, ...props }: { node?: unknown; className?: string; children?: React.ReactNode }) => {
    const match = /language-(\w+)/.exec(className || "");
    const hasNewlines = String(children).includes("\n");
    const isInline = !match && !hasNewlines;

    if (isInline) {
      return (
        <code
          className={cn(
            "bg-muted rounded px-1.5 py-0.5 font-mono text-xs",
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <CodeBlock
        language={match ? match[1] : "plaintext"}
        value={String(children).replace(/\n$/, "")}
      />
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <Link
      href={href || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        text-primary underline underline-offset-2
        hover:no-underline
      `}
    >
      {children}
    </Link>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
};

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    const hasMath = MATH_RE.test(content);

    if (hasMath) {
      return (
        <Suspense>
          <MathMarkdownBlock content={content} components={markdownComponents} />
        </Suspense>
      );
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content)
      return false;
    return true;
  },
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return blocks.map((block, index) => (
      <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
    ));
  },
);

MemoizedMarkdown.displayName = "MemoizedMarkdown";
