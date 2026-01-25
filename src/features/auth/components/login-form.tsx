"use client";

import {
  ArrowLeftIcon,
  LoaderIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/components/ui/input-otp";
import { Label } from "~/components/ui/label";
import { useAuthForm } from "~/features/auth/hooks/use-auth-form";

export function LoginForm({
  isLogin,
  onForgotPassword,
  onPending2FAChange,
}: {
  isLogin: boolean;
  onForgotPassword?: () => void;
  onPending2FAChange?: (pending: boolean) => void;
}) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    loading,
    pendingVerification,
    pending2FA,
    totpCode,
    setTotpCode,
    getFieldError,
    handleSignIn,
    handleSignUp,
    handleResendVerification,
    handleVerify2FA,
    handleVerifyBackupCode,
    reset2FA,
  } = useAuthForm();

  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  useEffect(() => {
    onPending2FAChange?.(pending2FA);
  }, [pending2FA, onPending2FAChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await handleSignIn();
    }
    else {
      await handleSignUp();
    }
  };

  if (pending2FA) {
    const handleSubmit2FA = async (e: React.FormEvent) => {
      e.preventDefault();
      if (useBackupCode) {
        await handleVerifyBackupCode(backupCode);
      }
      else {
        await handleVerify2FA();
      }
    };

    return (
      <form onSubmit={handleSubmit2FA} className="space-y-4">
        <button
          type="button"
          onClick={() => {
            reset2FA();
            setUseBackupCode(false);
            setBackupCode("");
          }}
          className={`
            text-muted-foreground flex items-center gap-1 text-sm
            transition-colors
            hover:text-foreground
          `}
        >
          <ArrowLeftIcon className="size-4" />
          Back to login
        </button>

        <div className="text-center">
          <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
          <p className="text-muted-foreground text-sm">
            {useBackupCode
              ? "Enter one of your recovery codes"
              : "Enter the 6-digit code from your authenticator app"}
          </p>
        </div>

        {useBackupCode
          ? (
              <div className="space-y-2">
                <Label htmlFor="backup-code">Recovery Code</Label>
                <Input
                  id="backup-code"
                  type="text"
                  value={backupCode}
                  onChange={e => setBackupCode(e.target.value)}
                  placeholder="Enter recovery code"
                  autoComplete="off"
                />
              </div>
            )
          : (
              <div className="space-y-2">
                <Label className="block text-center">Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={totpCode}
                    onChange={setTotpCode}
                    autoFocus
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
              </div>
            )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || (useBackupCode ? !backupCode : totpCode.length !== 6)}
        >
          {loading
            ? (
                <>
                  <LoaderIcon className="size-4 animate-spin" />
                  Verifying...
                </>
              )
            : "Verify"}
        </Button>

        <Button
          type="button"
          variant="link"
          className="text-muted-foreground w-full text-sm"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setBackupCode("");
            setTotpCode("");
          }}
        >
          {useBackupCode ? "Use authenticator app instead" : "Use a recovery code instead"}
        </Button>
      </form>
    );
  }

  if (pendingVerification) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm">
          We sent a verification link to
          {" "}
          <strong>{email}</strong>
        </p>
        <p className="text-muted-foreground text-xs">
          Please check your inbox and click the link to verify your account.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleResendVerification}
          disabled={loading}
        >
          {loading ? "Sending..." : "Resend verification email"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!isLogin && (
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            required
            aria-invalid={!!getFieldError("name")}
            className={getFieldError("name")
              ? `border-destructive`
              : ""}
          />
          {getFieldError("name") && (
            <p className="text-destructive text-xs">{getFieldError("name")}</p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          aria-invalid={!!getFieldError("email")}
          className={getFieldError("email")
            ? `border-destructive`
            : ""}
        />
        {getFieldError("email") && (
          <p className="text-destructive text-xs">{getFieldError("email")}</p>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {isLogin && onForgotPassword && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-muted-foreground h-auto p-0 text-xs"
              onClick={onForgotPassword}
            >
              Forgot password?
            </Button>
          )}
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          aria-invalid={!!getFieldError("password")}
          className={getFieldError("password")
            ? `border-destructive`
            : ""}
        />
        {getFieldError("password") && (
          <p className="text-destructive text-xs">{getFieldError("password")}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Loading...
              </>
            )
          : isLogin
            ? "Sign In"
            : "Create Account"}
      </Button>
    </form>
  );
}
