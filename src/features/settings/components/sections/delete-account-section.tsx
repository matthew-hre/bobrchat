"use client";

import { TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { deleteAccount } from "~/features/auth/actions";

import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { SettingsSection } from "../ui/settings-section";

export function DeleteAccountSection() {
  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      toast.success("Account deleted successfully");
    }
    catch (error) {
      toast.error("Failed to delete account");
      throw error;
    }
  };

  return (
    <SettingsSection title="Danger Zone" variant="danger">
      <div className="space-y-2">
        <ConfirmationDialog
          trigger={(
            <Button variant="destructive" className="w-full">
              Delete Account
            </Button>
          )}
          title="Delete Account"
          description="This action cannot be undone. All your data, including threads, settings, and preferences will be permanently deleted."
          icon={TriangleAlertIcon}
          confirmationType="text"
          confirmText="DELETE"
          confirmLabel="Delete Account"
          loadingLabel="Deleting..."
          onConfirm={handleDeleteAccount}
          variant="destructive"
        />
        <p className="text-muted-foreground text-xs">
          Permanently delete your account and all associated data.
        </p>
      </div>
    </SettingsSection>
  );
}
