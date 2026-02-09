/**
 * Detects programming language from code content
 * Uses hard checks, weighted pattern scoring, and tie-breaking
 */

type WeightedPattern = {
  pattern: RegExp;
  weight: number;
};

function w(pattern: RegExp, weight: number): WeightedPattern {
  return { pattern, weight };
}

const ANCHOR = 5;
const STRONG = 2;
const WEAK = 1;

const languagePatterns: Record<string, WeightedPattern[]> = {
  typescript: [
    w(/^import(?:\s+\S.*(?:[\n\r\u2028\u2029]\s*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])|\s{2,})from\s+['"].*['"];?$/m, WEAK),
    w(/interface\s+\w+\s*[{<]/, STRONG),
    w(/type\s+\w+\s*=/, STRONG),
    w(/:\s*(?:string|number|boolean|void|any|unknown|never)\s*[,;=)\]]/, STRONG),
    w(/\bas\s+const\b/, STRONG),
    w(/\bsatisfies\s+/, STRONG),
    w(/\breadonly\s+/, STRONG),
    w(/\benum\s+\w+\s*\{/, STRONG),
    w(/\bimplements\s+/, STRONG),
  ],
  javascript: [
    w(/^import(?:\s+\S.*(?:[\n\r\u2028\u2029]\s*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])|\s{2,})from\s+['"].*['"];?$/m, WEAK),
    w(/\bconst\s+\w+\s*=\s*(async\s+)?\(.*\)\s*=>/, STRONG),
    w(/function\s+\w+\s*\(/, WEAK),
    w(/\bfunction\s*\*/, STRONG),
    w(/\.then\(|\.catch\(|async\s+function/, WEAK),
    w(/\bconsole\.\w+\(/, WEAK),
    w(/\bmodule\.exports\b/, ANCHOR),
    w(/\brequire\s*\(\s*['"]/, STRONG),
  ],
  jsx: [
    w(/<[A-Z]\w+[\s/>]/, STRONG),
    w(/\bfunction\s+\w+\s*\(.*\)\s*\{[\s\S]*?return\s*\(/, STRONG),
    w(/React\.createElement/, ANCHOR),
    w(/import React(?:\s+from\s+['"]react['"])?;/, ANCHOR),
    w(/"use client"/, STRONG),
    w(/export\s+(default\s+)?function\s+\w+/, WEAK),
  ],
  tsx: [
    w(/<[A-Z]\w+[\s/>]/, STRONG),
    w(/interface\s+\w+Props/, ANCHOR),
    w(/type\s+\w+Props\s*=/, ANCHOR),
    w(/React\.FC/, ANCHOR),
    w(/"use client"/, STRONG),
    w(/:\s*(?:string|number|boolean|void|any|unknown)\s*[,;=)\]]/, STRONG),
  ],
  python: [
    w(/^from\s+\w+\s+import/m, STRONG),
    w(/^import\s+\w+/m, WEAK),
    w(/^def\s+\w+\s*\(/m, STRONG),
    w(/^class\s+\w.*:/m, STRONG),
    w(/^if\s+__name__\s*==\s*['"]__main__['"]/m, ANCHOR),
    w(/^\s+self\.\w+/m, STRONG),
    w(/print\s*\(/, WEAK),
  ],
  json: [
    w(/^\s*\{[\s\S]*\}\s*$/, WEAK),
    w(/^\s*\[[\s\S]*\]\s*$/, WEAK),
    w(/"\w+":\s*("[^"]*"|\d+|true|false|null|\[|\{)/, STRONG),
  ],
  yaml: [
    w(/^---\s*$/m, ANCHOR),
    w(/^[a-z_]\w*:\s*$/m, STRONG),
    w(/^[a-z_]\w*:\s+\S+/m, WEAK),
    w(/^\s+-\s+\w+/m, WEAK),
    w(/^\s+\w+:\s+/m, WEAK),
  ],
  sql: [
    w(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s+/im, ANCHOR),
    w(/\bFROM\s+\w+/i, STRONG),
    w(/\bWHERE\s+/i, STRONG),
    w(/\bJOIN\s+/i, STRONG),
    w(/\bGROUP\s+BY\b/i, STRONG),
    w(/\bORDER\s+BY\b/i, STRONG),
  ],
  html: [
    w(/^<!(DOCTYPE|doctype)/m, ANCHOR),
    w(/<html[^>]*>/i, ANCHOR),
    w(/<(head|body|div|span|p|a|button|form|input)[^>]*>/, STRONG),
    w(/<\/\w+>/, WEAK),
  ],
  css: [
    w(/^\.[\w-]+\s*\{/m, STRONG),
    w(/#[\w-]+\s*\{/, STRONG),
    w(/:\s*(px|em|rem|%|auto|flex|grid)/, STRONG),
    w(/@(media|keyframes|font-face)/, ANCHOR),
    w(/\{\s*[\w-]+\s*:.*;\s*\}/, WEAK),
  ],
  bash: [
    w(/^#!\s*\/.*\b(bash|sh|zsh)\b/, ANCHOR),
    w(/\bthen\b/, STRONG),
    w(/\bfi\b/, STRONG),
    w(/\besac\b/, ANCHOR),
    w(/\$\(\s*\w+/, STRONG),
    w(/\$\{?\w+\}?/, WEAK),
    w(/^(if|for|while)\s+/m, WEAK),
  ],
  ruby: [
    w(/^#!\s*\/.*\bruby\b/, ANCHOR),
    w(/^(def|class|module)\s+/m, STRONG),
    w(/\.each\s*(\{|\bdo\b)|\.map\s*(\{|\bdo\b)/, STRONG),
    w(/require\s+['"].*['"]/, STRONG),
    w(/\bend\s*$/m, WEAK),
    w(/puts\s+/, WEAK),
  ],
  go: [
    w(/^package\s+(main|\w+)/m, ANCHOR),
    w(/^import\s*\(/m, STRONG),
    w(/func\s+\w+\s*\(/, STRONG),
    w(/:\s*=\s*/, WEAK),
    w(/fmt\.\w+/, STRONG),
  ],
  rust: [
    w(/^fn\s+\w+\s*\(/m, STRONG),
    w(/^pub\s+(fn|struct|enum|mod|trait)\s+/m, ANCHOR),
    w(/struct\s+\w+\s*\{/, STRONG),
    w(/trait\s+\w+\s*\{/, STRONG),
    w(/impl(?:\s+\S.*(?:[\n\r\u2028\u2029]\s*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])|\s{2,})for\s+/, STRONG),
    w(/let\s+mut\s+\w+/, ANCHOR),
    w(/let\s+\w+/, WEAK),
    w(/println!\(|eprintln!\(/, ANCHOR),
  ],
  csharp: [
    w(/^namespace\s+\w+/m, ANCHOR),
    w(/^\s*(?:(public|private|protected|internal)\s+)?(class|interface|struct)\s+\w+/m, STRONG),
    w(/using\s+System/, ANCHOR),
    w(/using\s+\w+/, WEAK),
  ],
  php: [
    w(/^<\?php/m, ANCHOR),
    w(/\$\w+\s*=/, STRONG),
    w(/->/, WEAK),
    w(/::\w+/, WEAK),
    w(/function\s+\w+\s*\(/, WEAK),
  ],
  kotlin: [
    w(/^fun\s+\w+\s*\(/m, STRONG),
    w(/^class\s+\w+/m, WEAK),
    w(/val\s+\w+\s*[:=]/, STRONG),
    w(/var\s+\w+\s*[:=]/, STRONG),
    w(/println\s*\(/, WEAK),
  ],
  r: [
    w(/^library\(/m, ANCHOR),
    w(/<-/, STRONG),
    w(/%>%/, ANCHOR),
    w(/function\s*\(/, WEAK),
    w(/data\.frame\(/, ANCHOR),
  ],
  dockerfile: [
    w(/^FROM\s+\S+/m, ANCHOR),
    w(/^RUN\s+/m, STRONG),
    w(/^COPY\s+/m, STRONG),
    w(/^CMD\s+/m, STRONG),
    w(/^ENTRYPOINT\s+/m, ANCHOR),
    w(/^WORKDIR\s+/m, STRONG),
    w(/^EXPOSE\s+\d+/m, STRONG),
  ],
  makefile: [
    w(/^\.PHONY\s*:/m, ANCHOR),
    w(/^\w[\w.-]*:\s*\w/m, STRONG),
    w(/\$\(\w+\)/, STRONG),
    w(/^\t[@-]?\w/m, STRONG),
  ],
  markdown: [
    w(/^#{1,6}\s+\S/m, STRONG),
    w(/^\*\*\S.*\*\*|^__\S.*__/m, WEAK),
    w(/^\[.+\]\(.+\)/m, STRONG),
    w(/^```\w*/m, ANCHOR),
    w(/^>\s+\S/m, WEAK),
    w(/^[-*+]\s+\S/m, WEAK),
  ],
  nix: [
    w(/\{?\s*pkgs\s*(?:\}\s*)?:\s*/, ANCHOR),
    w(/mkDerivation/, ANCHOR),
    w(/^let\s*$/m, STRONG),
    w(/^in\s*$/m, STRONG),
    w(/with\s+\w+\s*;/, STRONG),
    w(/\binputs\s*:\s*\{/, STRONG),
  ],
};

const languageExtensions: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  jsx: "jsx",
  tsx: "tsx",
  python: "py",
  json: "json",
  yaml: "yml",
  sql: "sql",
  html: "html",
  css: "css",
  bash: "sh",
  ruby: "rb",
  go: "go",
  rust: "rs",
  csharp: "cs",
  php: "php",
  kotlin: "kt",
  r: "r",
  dockerfile: "dockerfile",
  makefile: "makefile",
  markdown: "md",
  nix: "nix",
  plaintext: "txt",
};

const shebangs: Record<string, string> = {
  bash: "bash",
  sh: "bash",
  zsh: "bash",
  node: "javascript",
  python: "python",
  python3: "python",
  ruby: "ruby",
};

function tryHardChecks(content: string): string | null {
  const firstLine = content.slice(0, content.indexOf("\n") || content.length).trim();

  if (firstLine.startsWith("#!")) {
    for (const [bin, lang] of Object.entries(shebangs)) {
      if (firstLine.includes(bin))
        return lang;
    }
  }

  if (firstLine.startsWith("<?php"))
    return "php";
  if (/^package\s+main\b/.test(firstLine))
    return "go";
  if (/^<!doctype\s+html/i.test(firstLine))
    return "html";

  const trimmed = content.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
    || (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return "json";
    }
    catch {
      // not valid JSON
    }
  }

  return null;
}

function getHeaderContent(content: string): string {
  let endIndex = 0;
  let newlineCount = 0;
  while (newlineCount < 15 && endIndex < content.length) {
    if (content[endIndex] === "\n") {
      newlineCount++;
    }
    endIndex++;
  }
  return content.slice(0, endIndex);
}

const JS_FAMILY = new Set(["javascript", "typescript", "jsx", "tsx"]);

const MIN_SCORE = 3;
const TIE_MARGIN = 2;

function disambiguateJsFamily(scores: Record<string, number>, headerContent: string): string {
  const hasJsxTags = /<[A-Z]\w+[\s/>]/.test(headerContent);
  const hasTypeAnnotations
    = /:\s*(?:string|number|boolean|void|any|unknown|never)\s*[,;=)\]]/.test(headerContent)
      || /interface\s+\w+/.test(headerContent)
      || /type\s+\w+\s*=/.test(headerContent)
      || /\bas\s+const\b/.test(headerContent)
      || /\benum\s+\w+\s*\{/.test(headerContent);

  if (hasJsxTags && hasTypeAnnotations)
    return "tsx";
  if (hasJsxTags)
    return "jsx";
  if (hasTypeAnnotations)
    return "typescript";
  return "javascript";
}

export function detectLanguage(content: string): string {
  const hardResult = tryHardChecks(content);
  if (hardResult)
    return hardResult;

  const headerContent = getHeaderContent(content);

  const scores: Record<string, number> = {};
  for (const [lang, patterns] of Object.entries(languagePatterns)) {
    let score = 0;
    for (const { pattern, weight } of patterns) {
      if (pattern.test(headerContent)) {
        score += weight;
      }
    }
    scores[lang] = score;
  }

  const sorted = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a);

  if (sorted.length === 0)
    return "plaintext";

  const [topLang, topScore] = sorted[0];

  if (topScore < MIN_SCORE)
    return "plaintext";

  if (sorted.length > 1) {
    const [secondLang, secondScore] = sorted[1];
    const bothJsFamily = JS_FAMILY.has(topLang) && JS_FAMILY.has(secondLang);

    if (!bothJsFamily && topScore - secondScore < TIE_MARGIN) {
      return "plaintext";
    }
  }

  if (JS_FAMILY.has(topLang)) {
    return disambiguateJsFamily(scores, headerContent);
  }

  return topLang;
}

export function getLanguageExtension(language: string): string {
  return languageExtensions[language] || "txt";
}

export function isLikelyCode(content: string): boolean {
  const language = detectLanguage(content);
  return language !== "plaintext";
}
