"use client";

import {
  LoaderIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useAuthForm } from "~/features/auth/hooks/use-auth-form";

export function LoginForm({
  isLogin,
  onForgotPassword,
}: {
  isLogin: boolean;
  onForgotPassword?: () => void;
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
    getFieldError,
    handleSignIn,
    handleSignUp,
    handleResendVerification,
  } = useAuthForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await handleSignIn();
    }
    else {
      await handleSignUp();
    }
  };

  if (pendingVerification) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm">
          We sent a verification link to <strong>{email}</strong>
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
