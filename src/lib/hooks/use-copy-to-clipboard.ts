"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

type UseCopyToClipboardOptions = {
  resetDelay?: number;
  successMessage?: string;
  errorMessage?: string;
};

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const {
    resetDelay = 1500,
    successMessage,
    errorMessage = "Failed to copy to clipboard",
  } = options;

  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (successMessage) {
          toast.success(successMessage);
        }
        setTimeout(() => setCopied(false), resetDelay);
        return true;
      }
      catch (error) {
        console.error("Failed to copy:", error);
        toast.error(errorMessage);
        return false;
      }
    },
    [resetDelay, successMessage, errorMessage],
  );

  return { copied, copy };
}
