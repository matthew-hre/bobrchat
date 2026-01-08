"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { SettingsTabs } from "~/components/settings/settings-tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "~/components/ui/dialog";

export function SettingsModalProvider() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show modal when settings param is present
  const isOpen = searchParams.has("settings");

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // Remove the settings param to close the modal
        const params = new URLSearchParams(searchParams.toString());
        params.delete("settings");
        const newSearch = params.toString();
        router.push(newSearch ? `?${newSearch}` : window.location.pathname, { scroll: false });
      }
    },
    [router, searchParams],
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`
          flex h-full max-h-[90vh] max-w-[80vw] min-w-[80vw] gap-0
          overflow-hidden p-0
        `}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <SettingsTabs />
      </DialogContent>
    </Dialog>
  );
}
