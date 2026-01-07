"use client";

import { useRouter } from "next/navigation";

import { SettingsTabs } from "~/components/settings/settings-tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "~/components/ui/dialog";

export default function SettingsPage() {
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.push("/");
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
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
