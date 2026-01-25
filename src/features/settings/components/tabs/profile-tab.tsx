"use client";

import BoringAvatar from "boring-avatars";
import { CopyIcon, DownloadIcon, KeyIcon, LoaderIcon, MailIcon, ShieldCheckIcon, ShieldOffIcon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/components/ui/input-otp";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { authClient, twoFactor, useSession } from "~/features/auth/lib/auth-client";
import { useHasCredentialAccount } from "~/features/settings/hooks/use-has-credential-account";
import { usePasswordChangeForm } from "~/features/settings/hooks/use-password-change-form";

export function ProfileTab() {
  const { data: session, isPending } = useSession();
  const hasCredentialAccount = useHasCredentialAccount();

  if (isPending || hasCredentialAccount === null) {
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

          {hasCredentialAccount && <ChangeEmailSection />}

          {hasCredentialAccount && <ChangePasswordSection />}

          <TwoFactorSection hasCredentialAccount={hasCredentialAccount} />

          <Separator />

          <DeleteAccountSection />
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
  const {
    open,
    setOpen,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    canSubmit,
    passwordsMatch,
    handleChangePassword,
  } = usePasswordChangeForm();

  return (
    <div className="space-y-2">
      <Label>Password</Label>
      <Dialog open={open} onOpenChange={setOpen}>
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
              {!passwordsMatch && (
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
  );
}

function ChangeEmailSection() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

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

function TwoFactorSection({ hasCredentialAccount }: { hasCredentialAccount: boolean }) {
  const { data: session } = useSession();

  const is2FAEnabled = session?.user?.twoFactorEnabled ?? false;

  if (!hasCredentialAccount && !is2FAEnabled) {
    return (
      <>
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldOffIcon className="text-muted-foreground size-5" />
            <div>
              <Label className="text-base">Two-Factor Authentication</Label>
              <p className="text-muted-foreground text-sm">
                2FA is not available for accounts using only social login. Set a password first to enable 2FA.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {is2FAEnabled
            ? <ShieldCheckIcon className="text-success size-5" />
            : <ShieldOffIcon className="text-muted-foreground size-5" />}
          <div>
            <Label className="text-base">Two-Factor Authentication</Label>
            <p className="text-muted-foreground text-sm">
              {is2FAEnabled
                ? "Your account is protected with 2FA."
                : "Add an extra layer of security to your account."}
            </p>
          </div>
        </div>

        {is2FAEnabled
          ? <Disable2FADialog />
          : <Enable2FADialog />}

        {is2FAEnabled && (
          <>
            <ViewRecoveryCodesDialog />
          </>
        )}
      </div>
    </>
  );
}

function Enable2FADialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"password" | "verify">("password");
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleEnable = useCallback(async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    const result = await twoFactor.enable({
      password,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error.message || "Failed to enable 2FA");
      return;
    }

    if (result.data?.totpURI) {
      setTotpURI(result.data.totpURI);
      setBackupCodes(result.data.backupCodes || []);
      setStep("verify");
    }
  }, [password]);

  const handleVerify = useCallback(async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setVerifying(true);
    const result = await twoFactor.verifyTotp({
      code: verificationCode,
    });
    setVerifying(false);

    if (result.error) {
      toast.error(result.error.message || "Invalid verification code");
      return;
    }

    toast.success("Two-factor authentication enabled!");
    setOpen(false);
    setStep("password");
    setPassword("");
    setVerificationCode("");
    setTotpURI("");
  }, [verificationCode]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setStep("password");
      setPassword("");
      setVerificationCode("");
      setTotpURI("");
      setBackupCodes([]);
    }
  }, []);

  const downloadBackupCodes = useCallback(() => {
    const content = `BobrChat Recovery Codes\n${"=".repeat(30)}\n\nSave these codes in a secure location.\nEach code can only be used once.\n\n${backupCodes.join("\n")}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bobrchat-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [backupCodes]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <ShieldCheckIcon className="size-4" />
          Enable Two-Factor Authentication
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5" />
            {step === "password" ? "Set Up 2FA" : "Verify Setup"}
          </DialogTitle>
          <DialogDescription>
            {step === "password"
              ? "Enter your password to set up two-factor authentication."
              : "Scan the QR code with your authenticator app and enter the verification code."}
          </DialogDescription>
        </DialogHeader>

        {step === "password"
          ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="enable-2fa-password">Password</Label>
                  <Input
                    id="enable-2fa-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  onClick={handleEnable}
                  disabled={loading || !password}
                  className="w-full"
                >
                  {loading
                    ? (
                        <>
                          <LoaderIcon className="size-4 animate-spin" />
                          Generating...
                        </>
                      )
                    : "Continue"}
                </Button>
              </div>
            )
          : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-lg bg-white p-3">
                    <QRCodeSVG value={totpURI} size={180} />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <p className="text-muted-foreground text-sm">
                    Scan the QR code with your authenticator app, then enter the 6-digit code below.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(totpURI);
                      toast.success("Setup key copied to clipboard");
                    }}
                  >
                    <CopyIcon className="size-4" />
                    Copy setup key
                  </Button>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {backupCodes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm font-medium">
                      Save your recovery codes:
                    </p>
                    <div className={`
                      bg-muted grid grid-cols-2 gap-2 rounded-lg p-4 font-mono
                      text-sm
                    `}
                    >
                      {backupCodes.map((code, index) => (
                        <div key={index} className="text-center">
                          {code}
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      onClick={downloadBackupCodes}
                      className="w-full"
                    >
                      <DownloadIcon className="size-4" />
                      Download Recovery Codes
                    </Button>
                  </div>
                )}
              </div>
            )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {step === "verify" && (
            <Button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || verifying}
            >
              {verifying
                ? (
                    <>
                      <LoaderIcon className="size-4 animate-spin" />
                      Verifying...
                    </>
                  )
                : "Verify & Enable"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Disable2FADialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDisable = useCallback(async () => {
    setLoading(true);
    const result = await twoFactor.disable({
      password,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error.message || "Failed to disable 2FA");
      return;
    }

    toast.success("Two-factor authentication disabled");
    setOpen(false);
    setPassword("");
  }, [password]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <ShieldOffIcon className="size-4" />
          Disable Two-Factor Authentication
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOffIcon className="size-5" />
            Disable 2FA
          </DialogTitle>
          <DialogDescription>
            Enter your password to disable two-factor authentication. This will make your account less secure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="disable-password">Password</Label>
          <Input
            id="disable-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={!password || loading}
          >
            {loading
              ? (
                  <>
                    <LoaderIcon className="size-4 animate-spin" />
                    Disabling...
                  </>
                )
              : "Disable 2FA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewRecoveryCodesDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerateCodes = useCallback(async () => {
    setLoading(true);
    const result = await twoFactor.generateBackupCodes({
      password,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error.message || "Failed to generate recovery codes");
      return;
    }

    if (result.data?.backupCodes) {
      setBackupCodes(result.data.backupCodes);
    }
  }, [password]);

  const downloadBackupCodes = useCallback(() => {
    const content = `BobrChat Recovery Codes\n${"=".repeat(30)}\n\nSave these codes in a secure location.\nEach code can only be used once.\n\n${backupCodes.join("\n")}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bobrchat-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [backupCodes]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setPassword("");
      setBackupCodes([]);
    }
  }, []);

  return (
    <div className="space-y-2">
      <Label>Recovery Codes</Label>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <DownloadIcon className="size-4" />
            Generate New Recovery Codes
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DownloadIcon className="size-5" />
              Recovery Codes
            </DialogTitle>
            <DialogDescription>
              {backupCodes.length > 0
                ? "These codes can be used to access your account if you lose your authenticator. Save them in a secure location."
                : "Generate new recovery codes. This will invalidate any existing codes."}
            </DialogDescription>
          </DialogHeader>

          {backupCodes.length === 0
            ? (
                <div className="space-y-2">
                  <Label htmlFor="view-password">Password</Label>
                  <Input
                    id="view-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </div>
              )
            : (
                <div className="space-y-4">
                  <div className={`
                    bg-muted grid grid-cols-2 gap-2 rounded-lg p-4 font-mono
                    text-sm
                  `}
                  >
                    {backupCodes.map((code, index) => (
                      <div key={index} className="text-center">
                        {code}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={downloadBackupCodes}
                    className="w-full"
                  >
                    <DownloadIcon className="size-4" />
                    Download Recovery Codes
                  </Button>
                </div>
              )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {backupCodes.length === 0 && (
              <Button
                onClick={handleGenerateCodes}
                disabled={!password || loading}
              >
                {loading
                  ? (
                      <>
                        <LoaderIcon className="size-4 animate-spin" />
                        Generating...
                      </>
                    )
                  : "Generate Codes"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p className="text-muted-foreground text-xs">
        Generate new backup codes. This will invalidate any previous codes.
      </p>
    </div>
  );
}

function DeleteAccountSection() {
  const router = useRouter();
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  const canDeleteAccount = deleteAccountConfirmText === "DELETE";

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
