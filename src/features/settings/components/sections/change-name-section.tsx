"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "~/features/auth/lib/auth-client";

import { ActionInputItem } from "../ui/action-input-item";

export function ChangeNameSection({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const hasChanges = name !== currentName && name.trim() !== "";

  const handleSave = async () => {
    if (!hasChanges)
      return;

    setLoading(true);
    const { error } = await authClient.updateUser({
      name: name.trim(),
    });
    setLoading(false);

    if (error) {
      toast.error("Failed to update name");
      return;
    }

    toast.success("Name updated successfully");
  };

  return (
    <ActionInputItem
      label="Display Name"
      value={name}
      onChange={setName}
      placeholder="Your name"
      actionLabel="Save"
      onAction={handleSave}
      disabled={!hasChanges}
      loading={loading}
    />
  );
}
