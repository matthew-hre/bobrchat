"use client";

import { useMemo } from "react";

import { normalizeLanguage } from "~/lib/syntax/languages";
import { cn } from "~/lib/utils";
import { Prism } from "~/lib/syntax/prism";

export function useHighlightedHtml(code: string | null | undefined, language?: string) {
  const lang = normalizeLanguage(language);
  return useMemo(() => {
    if (!code)
      return null;
    const grammar = Prism.languages[lang];
    return grammar ? Prism.highlight(code, grammar, lang) : null;
  }, [code, lang]);
}

export function HighlightedCode({
  code,
  language,
  wrap,
  className,
}: {
  code: string;
  language?: string;
  wrap: boolean;
  className?: string;
}) {
  const lang = normalizeLanguage(language);
  const highlightedHtml = useHighlightedHtml(code, lang);

  return (
    <div className={cn("prism-code overflow-x-auto p-4 font-mono text-xs", className)}>
      <pre className={cn(
        wrap
          ? "wrap-break-word whitespace-pre-wrap"
          : "overflow-x-auto whitespace-pre",
      )}
      >
        {highlightedHtml
          ? (
              <code
                className={`language-${lang}`}
                // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            )
          : (
              <code className={`language-${lang}`}>
                {code}
              </code>
            )}
      </pre>
    </div>
  );
}
