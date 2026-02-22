const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred";
const INSUFFICIENT_CREDITS_PATTERN = /insufficient credits/i;

export function getAIErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return DEFAULT_ERROR_MESSAGE;
  }

  return error.message || "Failed to send message";
}

export function parseAIError(error: unknown): string {
  return getAIErrorMessage(error);
}

export function isInsufficientCreditsError(error: unknown): boolean {
  return INSUFFICIENT_CREDITS_PATTERN.test(getAIErrorMessage(error));
}
