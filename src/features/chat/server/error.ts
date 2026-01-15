import { APICallError } from "ai";

type OpenRouterErrorMetadata = {
  raw?: string;
  provider_name?: string;
};

type OpenRouterError = {
  error?: {
    message?: string;
    code?: number;
    metadata?: OpenRouterErrorMetadata;
  };
};

type NestedProviderError = {
  error?: {
    message?: string;
    type?: string;
  };
};

const ERROR_HINTS: Record<string, string> = {
  "User not found.": "Your OpenRouter API key may be invalid. Please check your API key in settings.",
};

export function formatProviderError(error: unknown): string {
  if (!APICallError.isInstance(error)) {
    if (error instanceof Error) {
      return error.message;
    }
    return "An unexpected error occurred";
  }

  const responseBody = error.responseBody;
  if (!responseBody) {
    return error.message || "API request failed";
  }

  try {
    const parsed: OpenRouterError = JSON.parse(responseBody);
    const metadata = parsed.error?.metadata;

    if (metadata?.raw) {
      const nested: NestedProviderError = JSON.parse(metadata.raw);
      if (nested.error?.message) {
        const providerName = metadata.provider_name;
        return providerName
          ? `${providerName}: ${nested.error.message}`
          : nested.error.message;
      }
    }

    if (parsed.error?.message) {
      const message = parsed.error.message;
      return ERROR_HINTS[message] ?? message;
    }
  }
  catch {
    // JSON parsing failed, fall through to default
  }

  return error.message || "API request failed";
}
