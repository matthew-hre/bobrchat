/**
 * Map provider names to their logo file paths
 */
const PROVIDER_LOGOS: Record<string, string> = {
  "cohere": "/logos/providers/cohere.svg",
  "anthropic": "/logos/providers/anthropic.svg",
  "openai": "/logos/providers/openai.svg",
  "google": "/logos/providers/google.svg",
  "mistralai": "/logos/providers/mistral.svg",
  "qwen": "/logos/providers/qwen.svg",
  "deepseek": "/logos/providers/deepseek.svg",
  "xai": "/logos/providers/xai.svg",
  "z-ai": "/logos/providers/zai.svg",
  "minimax": "/logos/providers/minimax.svg",
};

export function getProviderLogo(provider: string): string | null {
  return PROVIDER_LOGOS[provider.toLowerCase()] || null;
}

export function hasProviderLogo(provider: string): boolean {
  return !!getProviderLogo(provider);
}
