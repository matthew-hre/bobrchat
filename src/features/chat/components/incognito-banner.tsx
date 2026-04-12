"use client";

import { EyeOffIcon } from "lucide-react";

export function IncognitoBanner() {
  return (
    <div className={`
      text-muted-foreground flex items-center justify-center gap-2 border-b
      border-dashed px-3 py-2 text-xs
    `}
    >
      <EyeOffIcon className="size-3.5 shrink-0" />
      <span>Incognito mode — this chat won&apos;t be saved</span>
    </div>
  );
}
