"use client";

import { LoaderIcon } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/features/auth/lib/auth-client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (error === "INVALID_TOKEN") {
    return (
      <div className="space-y-3 text-center">
        <p className="text-destructive text-sm">
          This password reset link is invalid or has expired.
        </p>
        <Button onClick={() => router.push("/auth")} className="w-full">
          Back to sign in
        </Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-muted-foreground text-sm">
          No reset token found. Please request a new password reset.
        </p>
        <Button onClick={() => router.push("/auth")} className="w-full">
          Back to sign in
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);

    if (resetError) {
      toast.error("Failed to reset password. The link may have expired.");
      return;
    }

    setSuccess(true);
    toast.success("Password reset successfully!");
  };

  if (success) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm">Your password has been reset successfully.</p>
        <Button onClick={() => router.push("/auth")} className="w-full">
          Sign in with new password
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Resetting...
              </>
            )
          : "Reset password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Image
              src="/icon.png"
              alt="BobrChat"
              width={24}
              height={24}
              className="rounded-full"
            />
            <span className="text-sm font-semibold">BobrChat</span>
          </div>
          <h1 className="text-lg font-semibold">Reset your password</h1>
          <p className="text-muted-foreground pt-2 text-sm">
            Enter your new password below.
          </p>
        </div>

        <Suspense fallback={(
          <div className="text-muted-foreground text-center text-sm">
            Loading...
          </div>
        )}
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
