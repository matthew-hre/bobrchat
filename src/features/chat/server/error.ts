import { APICallError, NoSuchToolError, RetryError } from "ai";

/**
 * OpenRouter wraps upstream errors in a metadata envelope:
 * { error: { message, code (number), metadata: { raw, provider_name } } }
 */
type OpenRouterMetadata = {
  raw?: string;
  provider_name?: string;
};

/**
 * Unified parsed error shape that covers both:
 * - OpenRouter: { error: { message, code: number, metadata: { raw, provider_name } } }
 * - OpenAI:     { error: { message, type: string, code: string } }
 */
type ParsedApiError = {
  error?: {
    message?: string;
    type?: string;
    code?: number | string;
    metadata?: OpenRouterMetadata;
  };
};

const ERROR_HINTS: Record<string, string> = {
  "User not found.": "Your OpenRouter API key may be invalid. Please check your API key in settings.",
  "Provider returned error": "The model provider returned an error. This may be a temporary issue—try again or select a different model.",
};

const ERROR_PATTERN_HINTS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /Thought signature is not valid/i,
    message: "This model's thinking tokens became invalid. Please try again or start a new thread.",
  },
  {
    pattern: /Incorrect API key provided/i,
    message: "Your API key is invalid. Please check your API key in settings.",
  },
  {
    pattern: /You exceeded your current quota/i,
    message: "Your API key has exceeded its quota. Please check your billing details.",
  },
];

const STATUS_CODE_MESSAGES: Record<number, string> = {
  400: "Bad request. The request was malformed or invalid.",
  401: "Authentication failed. Please check your API key in settings.",
  402: "Insufficient credits. Please check your account billing details.",
  403: "Access denied. You may not have permission to use this model.",
  408: "Request timed out. Please try again.",
  429: "Rate limit exceeded. Please wait a moment and try again.",
  500: "The AI provider encountered an internal error. Please try again.",
  502: "The AI provider is temporarily unavailable. Please try again.",
  503: "The AI provider is temporarily unavailable. Please try again.",
};

/**
 * Formats an API error into a user-friendly message.
 *
 * Handles errors from any provider (OpenRouter, OpenAI, etc.) by:
 * 1. Unwrapping RetryError / NoSuchToolError wrappers
 * 2. Parsing OpenRouter's nested metadata.raw envelope
 * 3. Matching error messages/patterns against known hints
 * 4. Falling back to HTTP status code messages
 */
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
    const parsed: ParsedApiError = JSON.parse(responseBody);
    const metadata = parsed.error?.metadata;
    const statusCode = typeof parsed.error?.code === "number" ? parsed.error.code : undefined;

    // OpenRouter nests the upstream provider's error in metadata.raw
    if (metadata?.raw) {
      try {
        const nested: ParsedApiError = JSON.parse(metadata.raw);
        if (nested.error?.message) {
          const patternHint = ERROR_PATTERN_HINTS.find(h => h.pattern.test(nested.error!.message!));
          if (patternHint)
            return patternHint.message;
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

    // Check for status code-specific messages (only for numeric codes)
    if (statusCode && STATUS_CODE_MESSAGES[statusCode]) {
      return STATUS_CODE_MESSAGES[statusCode];
    }

    // Direct provider errors (OpenAI, etc.) land here — check patterns then hints
    if (parsed.error?.message) {
      const message = parsed.error.message;
      const patternHint = ERROR_PATTERN_HINTS.find(h => h.pattern.test(message));
      if (patternHint)
        return patternHint.message;
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
