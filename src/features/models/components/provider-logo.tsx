import Image from "next/image";
import { memo } from "react";

import { cn } from "~/lib/utils";

import { getProviderLogo } from "../utils/provider-logos";

type ProviderLogoProps = {
  provider: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

export const ProviderLogo = memo(({
  provider,
  size = "md",
  className,
}: ProviderLogoProps) => {
  const logoPath = getProviderLogo(provider);

  if (!logoPath) {
    return null;
  }

  return (
    <Image
      src={logoPath}
      alt={`${provider} logo`}
      width={24}
      height={24}
      className={cn(sizeMap[size], `
        invert-0
        dark:invert
      `, className)}
    />
  );
});

ProviderLogo.displayName = "ProviderLogo";
