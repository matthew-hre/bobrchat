/**
 * Format a model name, optionally removing the provider prefix
 * E.g., "Anthropic: Claude 3.5 Sonnet" -> "Claude 3.5 Sonnet"
 */
export function formatModelName(
  name: string,
  hideProviderPrefix: boolean = false,
): string {
  if (!hideProviderPrefix) {
    return name;
  }

  // Remove "Provider: " prefix if it exists
  const match = name.match(/^[^:]+:\s*(.*)/);
  return match ? match[1] : name;
}
