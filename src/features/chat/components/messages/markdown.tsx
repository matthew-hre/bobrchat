/* eslint-disable react/no-array-index-key */
import { marked } from "marked";
import Link from "next/link";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { CodeBlock } from "~/features/chat/components/messages/code-block";
import { cn } from "~/lib/utils";

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map(token => token.raw);
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath]]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: ({ node, className, children, ...props }) => {
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
          pre: ({ children }) => <>{children}</>,
          a: ({ href, children }) => (
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
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
        }}
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
