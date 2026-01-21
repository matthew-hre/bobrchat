"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "~/features/auth/lib/auth-client";

export function usePasswordChangeForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasCredentialAccount, setHasCredentialAccount] = useState<boolean | null>(null);

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      const hasCredential = data?.some(account => account.providerId === "credential") ?? false;
      setHasCredentialAccount(hasCredential);
    });
  }, []);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const canSubmit
    = currentPassword.trim() !== ""
      && newPassword.trim() !== ""
      && confirmPassword.trim() !== ""
      && newPassword === confirmPassword;

  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen)
      resetForm();
  };

  const handleChangePassword = async () => {
    if (!canSubmit)
      return false;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    setLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to change password");
      return false;
    }

    toast.success("Password changed successfully");
    resetForm();
    setOpen(false);
    return true;
  };

  return {
    open,
    setOpen: handleOpenChange,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    hasCredentialAccount,
    canSubmit,
    passwordsMatch,
    handleChangePassword,
  };
}
