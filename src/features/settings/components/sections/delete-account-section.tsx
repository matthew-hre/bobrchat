"use client";

import { Button, Card, Flex, Grid, Inset, Text } from "@radix-ui/themes";
import { KeyRoundIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { deleteAccount } from "~/features/auth/actions";

import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { SettingsSection } from "../ui/settings-section";

function IconPanel({ children }: { children?: React.ReactNode }) {
  return (
    <Flex
      width="32px"
      height="32px"
      align="center"
      justify="center"
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--gray-4)",
        borderRadius: "var(--radius-3)",
        backgroundColor: "var(--gray-2)",
      }}
    >
      {children}
    </Flex>
  );
}

export function DeleteAccountSection() {
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
    <SettingsSection title="Danger Zone" description="Irreversible and destructive actions." variant="danger">
      <Card size="2">
        <Inset side="all" clip="padding-box">
          <Inset side="x" px="current" className="woswidgets-card-list-item" clip="padding-box">
            <Grid columns="auto 1fr auto" align="center" gap="4" px="4" py="4">
              <IconPanel>
                <KeyRoundIcon className="size-4" style={{ color: "var(--gray-11)" }} />
              </IconPanel>
              <Flex direction="column">
                <Text size="2" highContrast weight="bold" as="p" mb="-2px">
                  Encryption Key
                </Text>
                <Text size="2" color="gray">
                  Generate a new key and re-encrypt all thread messages.
                </Text>
              </Flex>
              <ConfirmationDialog
                trigger={(
                  <Button highContrast variant="surface" color="gray" disabled={isRotating}>
                    {isRotating ? "Rotating..." : "Rotate Key"}
                  </Button>
                )}
                title="Rotate Encryption Key"
                description="This will generate a new encryption key and re-encrypt all your thread messages. This may take a moment."
                icon={KeyRoundIcon}
                confirmLabel="Rotate Key"
                loadingLabel="Rotating..."
                onConfirm={handleRotateKey}
              />
            </Grid>
          </Inset>
          <Inset side="x" px="current" className="woswidgets-card-list-item" clip="padding-box">
            <Grid columns="auto 1fr auto" align="center" gap="4" px="4" py="4">
              <IconPanel>
                <Trash2Icon className="size-4" style={{ color: "var(--gray-11)" }} />
              </IconPanel>
              <Flex direction="column">
                <Text size="2" highContrast weight="bold" as="p" mb="-2px">
                  Delete Account
                </Text>
                <Text size="2" color="gray">
                  Permanently delete your account and all associated data.
                </Text>
              </Flex>
              <ConfirmationDialog
                trigger={(
                  <Button variant="solid" color="red">
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
            </Grid>
          </Inset>
        </Inset>
      </Card>
    </SettingsSection>
  );
}
