import type { StaticImageData } from "next/image";

import anthropic from "../../../../public/logos/providers/anthropic.svg";
import cohere from "../../../../public/logos/providers/cohere.svg";
import deepseek from "../../../../public/logos/providers/deepseek.svg";
import google from "../../../../public/logos/providers/google.svg";
import meta from "../../../../public/logos/providers/meta.svg";
import minimax from "../../../../public/logos/providers/minimax.svg";
import mistral from "../../../../public/logos/providers/mistral.svg";
import moonshot from "../../../../public/logos/providers/moonshot.svg";
import nvidia from "../../../../public/logos/providers/nvidia.svg";
import openai from "../../../../public/logos/providers/openai.svg";
import openrouter from "../../../../public/logos/providers/openrouter.svg";
import qwen from "../../../../public/logos/providers/qwen.svg";
import xai from "../../../../public/logos/providers/xai.svg";
import zai from "../../../../public/logos/providers/zai.svg";

/**
 * Map provider names to their statically imported logo assets
 */
const PROVIDER_LOGOS: Record<string, StaticImageData> = {
  "cohere": cohere as StaticImageData,
  "anthropic": anthropic as StaticImageData,
  "openai": openai as StaticImageData,
  "google": google as StaticImageData,
  "meta-llama": meta as StaticImageData,
  "mistralai": mistral as StaticImageData,
  "moonshotai": moonshot as StaticImageData,
  "nvidia": nvidia as StaticImageData,
  "openrouter": openrouter as StaticImageData,
  "qwen": qwen as StaticImageData,
  "deepseek": deepseek as StaticImageData,
  "x-ai": xai as StaticImageData,
  "z-ai": zai as StaticImageData,
  "minimax": minimax as StaticImageData,
};

export function getProviderLogo(provider: string): StaticImageData | null {
  return PROVIDER_LOGOS[provider.toLowerCase()] || null;
}

export function hasProviderLogo(provider: string): boolean {
  return !!getProviderLogo(provider);
}
