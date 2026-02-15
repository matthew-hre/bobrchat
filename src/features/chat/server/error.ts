import { APICallError, NoSuchToolError, RetryError } from "ai";

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
  "Provider returned error": "The model provider returned an error. This may be a temporary issue—try again or select a different model.",
};

const STATUS_CODE_MESSAGES: Record<number, string> = {
  400: "Bad request. The request was malformed or invalid.",
  401: "Authentication failed. Please check your API key in settings.",
  402: "The OpenRouter account or the underlying API key has insufficient credits.",
  403: "Access denied. You may not have permission to use this model.",
  408: "Request timed out. Please try again.",
  429: "Rate limit exceeded. Please wait a moment and try again.",
  500: "The AI provider encountered an internal error. Please try again.",
  502: "The AI provider is temporarily unavailable. Please try again.",
  503: "The AI provider is temporarily unavailable. Please try again.",
};

export function formatProviderError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  // Unwrap RetryError to get the underlying APICallError
  if (RetryError.isInstance(error)) {
    return formatProviderError(error.lastError);
  }

  if (NoSuchToolError.isInstance(error)) {
    return `The model tried to call an unavailable tool. Please try again.`;
  }

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
    const statusCode = parsed.error?.code;

    if (metadata?.raw) {
      try {
        const nested: NestedProviderError = JSON.parse(metadata.raw);
        if (nested.error?.message) {
          const providerName = metadata.provider_name;
          return providerName
            ? `${providerName}: ${nested.error.message}`
            : nested.error.message;
        }
      }
      catch {
        // Raw might be a simple string like {"error":"message"}
        const simpleError = JSON.parse(metadata.raw) as { error?: string };
        if (simpleError.error) {
          const providerName = metadata.provider_name;
          return providerName
            ? `${providerName}: ${simpleError.error}`
            : simpleError.error;
        }
      }
    }

    // Check for status code-specific messages
    if (statusCode && STATUS_CODE_MESSAGES[statusCode]) {
      return STATUS_CODE_MESSAGES[statusCode];
    }

    if (parsed.error?.message) {
      const message = parsed.error.message;
      return ERROR_HINTS[message] ?? message;
    }
  }
  catch {
    // JSON parsing failed, fall through to default
  }

  // Fall back to status code from the APICallError itself
  if (error.statusCode && STATUS_CODE_MESSAGES[error.statusCode]) {
    return STATUS_CODE_MESSAGES[error.statusCode];
  }

  return error.message || "API request failed";
}
