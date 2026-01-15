"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const BETA_BANNER_STORAGE_KEY = "bobrchat-hide-beta-banner";

export function BetaBanner() {
  const [showBetaBanner, setShowBetaBanner] = useState(false);

  useEffect(() => {
    const hide = window.localStorage.getItem(BETA_BANNER_STORAGE_KEY) === "true";
    setShowBetaBanner(!hide);
  }, []);

  const handleDismiss = () => {
    window.localStorage.setItem(BETA_BANNER_STORAGE_KEY, "true");
    setShowBetaBanner(false);
  };

  return (
    <div
      className={cn(
        !showBetaBanner && "invisible h-0",
        `
          bg-primary text-primary-foreground relative w-full p-2 text-center
          text-sm font-medium
        `,
      )}
    >
      <span>
        BobrChat is currently in beta. Please report any issues or feedback via
        {" "}
        <Link
          href="https://github.com/matthew-hre/bobrchat-issues/issues"
          target="_blank"
          rel="noopener noreferrer"
          className={`
            hover:text-primary-foreground/80
            underline
          `}
        >
          GitHub Issues
        </Link>
        . Thanks for testing!
      </span>
      <Button
        className="absolute top-1.5 right-4 size-6"
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
      >
        <XIcon size={16} />
      </Button>
    </div>
  );
}
