"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { SettingsTabs } from "~/components/settings/settings-tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "~/components/ui/dialog";

export default function SettingsModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const referrerParam = searchParams.get("referrer")
    ? decodeURIComponent(searchParams.get("referrer")!)
    : null;

  // Only show modal when we're actually on the settings route
  const isOpen = pathname === "/settings";

  // Store the initial referrer so it persists across tab changes
  const initialReferrer = useRef<string | null>(null);

  // Capture referrer when modal opens, reset when it closes
  useEffect(() => {
    if (isOpen && referrerParam && initialReferrer.current === null) {
      initialReferrer.current = referrerParam;
    }
    else if (!isOpen) {
      initialReferrer.current = null;
    }
  }, [isOpen, referrerParam]);

  // Use the stored referrer, or fall back to the current param
  const referrer = initialReferrer.current ?? referrerParam;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        router.push(referrer || "/");
      }
    },
    [router, referrer],
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`
          flex h-220 max-h-[80vh] w-225 max-w-[90vw] gap-0 overflow-hidden p-0
          sm:max-w-225
        `}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <SettingsTabs />
      </DialogContent>
    </Dialog>
  );
}
