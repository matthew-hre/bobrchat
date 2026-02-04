import type { ExtractInput, ExtractToolOutput, SearchInput, SearchToolOutput } from "./types";

import {
  PARALLEL_API_BASE,
  PARALLEL_BETA_HEADER,
} from "./types";

type ParallelSearchResponse = {
  search_id: string;
  results: Array<{
    url: string;
    title?: string | null;
    publish_date?: string | null;
    excerpts?: string[] | null;
  }>;
  warnings?: Array<{ message: string }> | null;
};

type ParallelExtractResponse = {
  extract_id: string;
  results: Array<{
    url: string;
    title?: string | null;
    publish_date?: string | null;
    excerpts?: string[] | null;
    full_content?: string | null;
  }>;
  errors: Array<{
    url: string;
    error_type: string;
    content?: string | null;
    http_status_code?: number | null;
  }>;
  warnings?: Array<{ message: string }> | null;
};

function mapStatusToErrorCode(status: number): "invalid_key" | "forbidden" | "rate_limited" | "request_failed" {
  switch (status) {
    case 401:
      return "invalid_key";
    case 403:
      return "forbidden";
    case 429:
      return "rate_limited";
    default:
      return "request_failed";
  }
}

function getErrorMessage(code: ReturnType<typeof mapStatusToErrorCode>): string {
  switch (code) {
    case "invalid_key":
      return "Your Parallel API key is invalid. Please check your API key in settings.";
    case "forbidden":
      return "Your Parallel API key does not have permission for this operation.";
    case "rate_limited":
      return "Search rate limit exceeded. Please try again later.";
    default:
      return "Search request failed. Please try again.";
  }
}

export async function parallelSearch(
  apiKey: string,
  input: SearchInput,
  signal?: AbortSignal,
): Promise<SearchToolOutput> {
  const body = {
    objective: input.objective,
    search_queries: input.search_queries,
    mode: input.mode,
    max_results: input.max_results,
    excerpts: {
      max_chars_per_result: input.max_chars_per_result,
    },
    source_policy: buildSourcePolicy(input.include_domains, input.exclude_domains),
  };

  try {
    const response = await fetch(`${PARALLEL_API_BASE}/v1beta/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "parallel-beta": PARALLEL_BETA_HEADER,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const code = mapStatusToErrorCode(response.status);
      return { error: true, code, message: getErrorMessage(code) };
    }

    const data = (await response.json()) as ParallelSearchResponse;

    return {
      searchId: data.search_id,
      sources: data.results.map(r => ({
        url: r.url,
        title: r.title ?? r.url,
        publishDate: r.publish_date ?? null,
        excerpts: r.excerpts ?? [],
      })),
    };
  }
  catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: true, code: "request_failed", message: "Search was cancelled." };
    }
    console.error("[search] request failed:", err);
    return { error: true, code: "request_failed", message: "Search request failed. Please try again." };
  }
}

export async function parallelExtract(
  apiKey: string,
  input: ExtractInput,
  signal?: AbortSignal,
): Promise<ExtractToolOutput> {
  const body = {
    urls: input.urls,
    objective: input.objective,
    search_queries: input.search_queries,
    excerpts: true,
    full_content: false,
  };

  try {
    const response = await fetch(`${PARALLEL_API_BASE}/v1beta/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "parallel-beta": PARALLEL_BETA_HEADER,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const code = mapStatusToErrorCode(response.status);
      return { error: true, code, message: getErrorMessage(code) };
    }

    const data = (await response.json()) as ParallelExtractResponse;

    return {
      extractId: data.extract_id,
      sources: data.results.map(r => ({
        url: r.url,
        title: r.title ?? null,
        publishDate: r.publish_date ?? null,
        excerpts: r.excerpts ?? [],
        fullContent: r.full_content ?? null,
      })),
      errors: data.errors.map(e => ({
        url: e.url,
        errorType: e.error_type,
        message: e.content ?? `HTTP ${e.http_status_code ?? "unknown"}`,
      })),
    };
  }
  catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: true, code: "request_failed", message: "Extract was cancelled." };
    }
    console.error("[extract] request failed:", err);
    return { error: true, code: "request_failed", message: "Extract request failed. Please try again." };
  }
}

function buildSourcePolicy(
  includeDomains?: string[],
  excludeDomains?: string[],
): { include_domains?: string[]; exclude_domains?: string[] } | undefined {
  if (!includeDomains?.length && !excludeDomains?.length) {
    return undefined;
  }
  return {
    ...(includeDomains?.length && { include_domains: includeDomains }),
    ...(excludeDomains?.length && { exclude_domains: excludeDomains }),
  };
}
