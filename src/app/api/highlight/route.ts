import type { NextRequest } from "next/server";
import type { Highlighter } from "shiki";

import { NextResponse } from "next/server";
import { createHighlighter } from "shiki";

const SUPPORTED_LANGS = [
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
] as const;

let highlighter: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark-dimmed", "github-light"],
      langs: [...SUPPORTED_LANGS],
    });
  }
  return highlighter;
}

export async function POST(request: NextRequest) {
  try {
    const { code, language, theme } = await request.json();

    if (typeof code !== "string") {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const hl = await getHighlighter();
    const lang = SUPPORTED_LANGS.includes(language) ? language : "plaintext";
    const selectedTheme = theme === "light" ? "github-light" : "github-dark-dimmed";

    const html = hl.codeToHtml(code, {
      lang,
      theme: selectedTheme,
    });

    return NextResponse.json({ html });
  }
  catch (error) {
    console.error("Highlight error:", error);
    return NextResponse.json(
      { error: "Failed to highlight code" },
      { status: 500 },
    );
  }
}
