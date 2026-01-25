"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { authClient } from "~/features/auth/lib/auth-client";

import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { SettingsSection } from "../ui/settings-section";

export function DeleteAccountSection() {
  const router = useRouter();

  const handleDeleteAccount = async () => {
    const { error } = await authClient.deleteUser();

    if (error) {
      toast.error(error.message || "Failed to delete account");
      throw error;
    }

    toast.success("Account deleted successfully");
    router.push("/auth");
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
          description="This action cannot be undone. All your data, including chats, settings, and preferences will be permanently deleted."
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
