"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { deleteAllThreads } from "~/features/settings/actions";
import { THREADS_KEY } from "~/lib/queries/query-keys";

import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { SettingsSection } from "../ui/settings-section";

export function DataManagementSection() {
  const queryClient = useQueryClient();

  const handleDeleteAllThreads = async () => {
    const { deletedCount } = await deleteAllThreads();
    await queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    toast.success(`Deleted ${deletedCount} thread${deletedCount === 1 ? "" : "s"}`);
  };

  return (
    <SettingsSection
      title="Data Management"
      description="Manage your thread data and history."
    >
      <div className="space-y-2">
        <ConfirmationDialog
          trigger={(
            <Button variant="destructive" className="w-full">
              <Trash2Icon className="size-4" />
              Delete All Threads
            </Button>
          )}
          title="Delete All Threads"
          description="This will permanently delete all your threads and messages. This action cannot be undone."
          icon={Trash2Icon}
          confirmLabel="Delete All Threads"
          loadingLabel="Deleting..."
          onConfirm={handleDeleteAllThreads}
          variant="destructive"
        />
        <p className="text-muted-foreground text-xs">
          Permanently delete all your thread history.
        </p>
      </div>
    </SettingsSection>
  );
}
