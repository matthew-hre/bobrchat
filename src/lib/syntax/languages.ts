export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  c: "c",
  cpp: "cpp",
  java: "java",
  cs: "csharp",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  dart: "dart",
  r: "r",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  xml: "markup",
  html: "markup",
  css: "css",
  md: "markdown",
  nix: "nix",
  zig: "zig",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hs: "haskell",
  ml: "ocaml",
  scala: "scala",
  clj: "clojure",
  pl: "perl",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "docker",
  makefile: "makefile",
  diff: "diff",
  regex: "regex",
};

export function getLanguageFromFilename(filename: string): string {
  const match = filename.match(/\.([a-z0-9]+)$/i);
  if (!match)
    return "plaintext";
  return EXTENSION_TO_LANGUAGE[match[1].toLowerCase()] ?? "plaintext";
}

export function normalizeLanguage(lang?: string): string {
  return (lang || "plaintext").trim().toLowerCase();
}
