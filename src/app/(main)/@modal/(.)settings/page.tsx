"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "~/components/ui/dialog";
import { SettingsPage } from "~/features/settings/components/settings-page";
import { usePreviousRoute } from "~/features/settings/previous-route-context";

export default function SettingsModal() {
  const router = useRouter();
  const { previousRoute } = usePreviousRoute();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("section") ?? searchParams.get("tab") ?? "theme";

  const handleClose = useCallback(() => {
    router.push(previousRoute);
  }, [router, previousRoute]);

  return (
    <Dialog open onOpenChange={open => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className={`
          flex h-[calc(100dvh-2rem)] max-h-none w-[calc(100vw-2rem)] max-w-none
          gap-0 overflow-hidden rounded-xl p-0
          md:h-[calc(100dvh-2.5rem)] md:w-[calc(100vw-6rem)]
          sm:max-w-none
        `}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <SettingsPage initialTab={initialTab} isModal onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
}
