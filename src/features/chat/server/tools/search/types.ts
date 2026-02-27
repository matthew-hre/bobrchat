import * as z from "zod";

export const PARALLEL_API_BASE = "https://api.parallel.ai";
export const PARALLEL_BETA_HEADER = "search-extract-2025-10-10";

export const searchInputSchema = z.object({
  objective: z
    .string()
    .max(500)
    .describe(
      "Natural-language description of the search goal. Include source or freshness guidance here.",
    ),
  search_queries: z
    .array(z.string().max(200))
    .max(5)
    .optional()
    .describe("Optional keyword queries (1-6 words each) to guide the search. Usually 1-3 queries."),
  mode: z
    .enum(["agentic", "one-shot"])
    .default("agentic")
    .describe(
      "\"agentic\" returns concise, token-efficient results for chat loops. \"one-shot\" returns comprehensive results for single queries.",
    ),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10)
    .describe("Maximum number of results to return."),
  max_chars_per_result: z
    .number()
    .int()
    .min(500)
    .max(30000)
    .default(5000)
    .describe("Maximum characters per result excerpt."),
  include_domains: z
    .array(z.string())
    .max(10)
    .optional()
    .describe("Restrict results to these domains only (e.g., ['wikipedia.org', 'github.com'])."),
  exclude_domains: z
    .array(z.string())
    .max(10)
    .optional()
    .describe("Exclude results from these domains."),
});

export type SearchInput = z.infer<typeof searchInputSchema>;

export const extractInputSchema = z.object({
  objective: z
    .string()
    .max(500)
    .describe("What information to extract from the URLs."),
  urls: z
    .array(z.url())
    .min(1)
    .max(10)
    .describe("URLs to extract content from."),
  search_queries: z
    .array(z.string().max(200))
    .max(5)
    .optional()
    .describe("Optional keyword queries to focus extraction."),
});

export type ExtractInput = z.infer<typeof extractInputSchema>;

export type SearchSource = {
  url: string;
  title: string;
  publishDate: string | null;
  excerpts: string[];
};

export type SearchOutput = {
  searchId: string;
  sources: SearchSource[];
};

export type SearchErrorOutput = {
  error: true;
  code: "invalid_key" | "forbidden" | "rate_limited" | "request_failed";
  message: string;
};

export type SearchToolOutput = SearchOutput | SearchErrorOutput;

export type ExtractSource = {
  url: string;
  title: string | null;
  publishDate: string | null;
  excerpts: string[];
  fullContent: string | null;
};

export type ExtractOutput = {
  extractId: string;
  sources: ExtractSource[];
  errors: Array<{ url: string; errorType: string; message: string }>;
};

export type ExtractErrorOutput = {
  error: true;
  code: "invalid_key" | "forbidden" | "rate_limited" | "request_failed";
  message: string;
};

export type ExtractToolOutput = ExtractOutput | ExtractErrorOutput;

export function isSearchError(output: SearchToolOutput): output is SearchErrorOutput {
  return "error" in output && output.error === true;
}

export function isExtractError(output: ExtractToolOutput): output is ExtractErrorOutput {
  return "error" in output && output.error === true;
}
