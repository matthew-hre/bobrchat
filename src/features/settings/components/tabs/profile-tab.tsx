"use client";

import BoringAvatar from "boring-avatars";
import { KeyIcon, LoaderIcon, MailIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { authClient, useSession } from "~/features/auth/lib/auth-client";
import { deleteAllThreads } from "~/features/settings/actions";

export function ProfileTab() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ProfileTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Profile</h3>
        <p className="text-muted-foreground text-sm">
          Manage your account details and personal information.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="size-20">
              <AvatarImage
                src={session?.user?.image || undefined}
                alt={session?.user?.name || "User"}
              />
              <AvatarFallback className="bg-transparent p-0">
                {session?.user?.image
                  ? null
                  : (
                      <BoringAvatar
                        size={80}
                        name={session?.user?.name || "user"}
                        variant="beam"
                        colors={["#F92672", "#A1EFE4", "#FD971F", "#E6DB74", "#66D9EF"]}
                      />
                    )}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-center text-xl font-medium">
                {session?.user?.name || "Unnamed User"}
              </h2>
              <p className="text-muted-foreground text-center text-sm">
                {session?.user?.email || "No email available"}
              </p>
            </div>
          </div>

          <Separator />

          <ChangeNameSection
            currentName={session?.user?.name || ""}
          />

          <ChangePasswordSection />

          <ChangeEmailSection />

          <Separator />

          <DangerZoneSection />
        </div>
      </div>
    </div>
  );
}

function ChangeNameSection({ currentName }: { currentName: string }) {
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
    <div className="space-y-2">
      <Label htmlFor="name">Display Name</Label>
      <div className="flex gap-2">
        <Input
          id="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
        />
        <Button
          onClick={handleSave}
          disabled={!hasChanges || loading}
          className="shrink-0"
        >
          {loading
            ? <LoaderIcon className="size-4 animate-spin" />
            : "Save"}
        </Button>
      </div>
    </div>
  );
}

function ChangePasswordSection() {
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

  const handleChangePassword = async () => {
    if (!canSubmit)
      return;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
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
      return;
    }

    toast.success("Password changed successfully");
    resetForm();
    setOpen(false);
  };

  if (hasCredentialAccount === null) {
    return (
      <>
        <Separator />
        <div className="space-y-2">
          <Label>Password</Label>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3 w-48" />
        </div>
      </>
    );
  }

  if (!hasCredentialAccount) {
    return null;
  }

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <Label>Password</Label>
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen)
              resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <KeyIcon className="size-4" />
              Change Password
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyIcon className="size-5" />
                Change Password
              </DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new password.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-destructive text-xs">
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleChangePassword}
                disabled={!canSubmit || loading}
              >
                {loading
                  ? (
                      <>
                        <LoaderIcon className="size-4 animate-spin" />
                        Changing...
                      </>
                    )
                  : (
                      "Change Password"
                    )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className="text-muted-foreground text-xs">
          Update your account password.
        </p>
      </div>
    </>
  );
}

function ChangeEmailSection() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasCredentialAccount, setHasCredentialAccount] = useState<boolean | null>(null);

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      const hasCredential = data?.some(account => account.providerId === "credential") ?? false;
      setHasCredentialAccount(hasCredential);
    });
  }, []);

  const resetForm = () => {
    setNewEmail("");
  };

  const canSubmit
    = newEmail.trim() !== ""
      && newEmail !== session?.user?.email;

  const handleChangeEmail = async () => {
    if (!canSubmit)
      return;

    setLoading(true);
    const { error } = await authClient.changeEmail({
      newEmail: newEmail.trim(),
      callbackURL: "/settings",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to change email");
      return;
    }

    toast.success("Verification email sent to your new address");
    resetForm();
    setOpen(false);
  };

  if (hasCredentialAccount === null) {
    return (
      <>
        <Separator />
        <div className="space-y-2">
          <Label>Email</Label>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3 w-48" />
        </div>
      </>
    );
  }

  if (!hasCredentialAccount) {
    return null;
  }

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <Label>Email</Label>
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen)
              resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <MailIcon className="size-4" />
              Change Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailIcon className="size-5" />
                Change Email
              </DialogTitle>
              <DialogDescription>
                Enter your new email address. A verification link will be sent to confirm the change.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-email">Current Email</Label>
                <Input
                  id="current-email"
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-email">New Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  autoComplete="email"
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleChangeEmail}
                disabled={!canSubmit || loading}
              >
                {loading
                  ? (
                      <>
                        <LoaderIcon className="size-4 animate-spin" />
                        Sending...
                      </>
                    )
                  : (
                      "Send Verification"
                    )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className="text-muted-foreground text-xs">
          Update your account email address.
        </p>
      </div>
    </>
  );
}

function DangerZoneSection() {
  const router = useRouter();
  const [deleteThreadsOpen, setDeleteThreadsOpen] = useState(false);
  const [deleteThreadsLoading, setDeleteThreadsLoading] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  const canDeleteAccount = deleteAccountConfirmText === "DELETE";

  const handleDeleteAllThreads = async () => {
    setDeleteThreadsLoading(true);
    try {
      const { deletedCount } = await deleteAllThreads();
      toast.success(`Deleted ${deletedCount} thread${deletedCount === 1 ? "" : "s"}`);
      setDeleteThreadsOpen(false);
    }
    catch {
      toast.error("Failed to delete threads");
    }
    finally {
      setDeleteThreadsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!canDeleteAccount)
      return;

    setDeleteAccountLoading(true);
    const { error } = await authClient.deleteUser();
    setDeleteAccountLoading(false);

    if (error) {
      toast.error(error.message || "Failed to delete account");
      return;
    }

    toast.success("Account deleted successfully");
    router.push("/auth");
  };

  return (
    <div className="space-y-4">
      <Label className="text-destructive">Danger Zone</Label>

      <div className="space-y-2">
        <Dialog open={deleteThreadsOpen} onOpenChange={setDeleteThreadsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Trash2Icon className="size-4" />
              Delete All Threads
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2Icon className="size-5" />
                Delete All Threads
              </DialogTitle>
              <DialogDescription>
                This will permanently delete all your chat threads and messages. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDeleteAllThreads}
                disabled={deleteThreadsLoading}
              >
                {deleteThreadsLoading
                  ? (
                      <>
                        <LoaderIcon className="size-4 animate-spin" />
                        Deleting...
                      </>
                    )
                  : "Delete All Threads"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className="text-muted-foreground text-xs">
          Permanently delete all your chat history.
        </p>
      </div>

      <div className="space-y-2">
        <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              Delete Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TriangleAlertIcon className="text-destructive size-5" />
                Delete Account
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. All your data, including chats, settings, and preferences will be permanently deleted.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Type
                {" "}
                <span className="font-mono font-bold">DELETE</span>
                {" "}
                to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={deleteAccountConfirmText}
                onChange={e => setDeleteAccountConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={!canDeleteAccount || deleteAccountLoading}
              >
                {deleteAccountLoading
                  ? (
                      <>
                        <LoaderIcon className="size-4 animate-spin" />
                        Deleting...
                      </>
                    )
                  : "Delete Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className="text-muted-foreground text-xs">
          Permanently delete your account and all associated data.
        </p>
      </div>
    </div>
  );
}

function ProfileTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-3 w-48" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-72" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
