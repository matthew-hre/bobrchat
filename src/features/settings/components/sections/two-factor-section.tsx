/* eslint-disable react/no-array-index-key */
// I do not care about using index as key in this specific case

"use client";

import { CopyIcon, DownloadIcon, LoaderIcon, ShieldCheckIcon, ShieldOffIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

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
import { twoFactor, useSession } from "~/features/auth/lib/auth-client";

export function TwoFactorSection({ hasCredentialAccount }: { hasCredentialAccount: boolean }) {
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
