"use client";

import { useQueryClient } from "@tanstack/react-query";
import { KeyRoundIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { deleteAllThreads } from "~/features/settings/actions";
import { THREADS_KEY } from "~/lib/queries/query-keys";

import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { SettingsSection } from "../ui/settings-section";

export function DataManagementSection() {
  const queryClient = useQueryClient();
  const [isRotating, setIsRotating] = useState(false);

  const handleRotateKey = async () => {
    setIsRotating(true);
    try {
      const res = await fetch("/api/settings/rotate-key", { method: "POST" });
      if (!res.ok)
        throw new Error("Failed to rotate key");
      toast.success("Encryption key rotated successfully");
    }
    catch {
      toast.error("Failed to rotate encryption key");
    }
    finally {
      setIsRotating(false);
    }
  };

  const handleDeleteAllThreads = async () => {
    const { deletedCount } = await deleteAllThreads();
    await queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    toast.success(`Deleted ${deletedCount} thread${deletedCount === 1 ? "" : "s"}`);
  };

  return (
    <SettingsSection
      title="Data Management"
      description="Manage your chat data and history."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <ConfirmationDialog
            trigger={(
              <Button variant="outline" className="w-full" disabled={isRotating}>
                <KeyRoundIcon className="size-4" />
                {isRotating ? "Rotating..." : "Rotate Encryption Key"}
              </Button>
            )}
            title="Rotate Encryption Key"
            description="This will generate a new encryption key and re-encrypt all your chat messages. This may take a moment."
            icon={KeyRoundIcon}
            confirmLabel="Rotate Key"
            loadingLabel="Rotating..."
            onConfirm={handleRotateKey}
          />
          <p className="text-muted-foreground text-xs">
            Rotate encryption key and re-encrypt chat messages.
          </p>
        </div>

        <div className="space-y-2">
          <ConfirmationDialog
            trigger={(
              <Button variant="destructive" className="w-full">
                <Trash2Icon className="size-4" />
                Delete All Threads
              </Button>
            )}
            title="Delete All Threads"
            description="This will permanently delete all your chat threads and messages. This action cannot be undone."
            icon={Trash2Icon}
            confirmLabel="Delete All Threads"
            loadingLabel="Deleting..."
            onConfirm={handleDeleteAllThreads}
            variant="destructive"
          />
          <p className="text-muted-foreground text-xs">
            Permanently delete all your chat history.
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
