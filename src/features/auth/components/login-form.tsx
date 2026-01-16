"use client";

import {
  LoaderIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { ValidationError } from "~/features/auth/types";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/features/auth/lib/auth-client";
import { signInSchema, signUpSchema } from "~/features/auth/types";

export function LoginForm({
  isLogin,
  onForgotPassword,
}: {
  isLogin: boolean;
  onForgotPassword?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(e => e.field === field)?.message;
  };

  const handleAuthError = (error: { code?: string; message?: string; status?: number; statusText?: string }) => {
    if (error.code === "EMAIL_NOT_VERIFIED") {
      setPendingVerification(true);
      toast.info("Please check your email to verify your account.");
      return;
    }

    const errorMessage = error.message || error.statusText || "Authentication failed";
    const lowerErrorMessage = errorMessage.toLowerCase();

    let userMessage = errorMessage;
    if (lowerErrorMessage.includes("user not found")) {
      userMessage = "No account found. Please sign up.";
    }
    else if (lowerErrorMessage.includes("invalid")) {
      userMessage = "Invalid email or password.";
    }
    else if (lowerErrorMessage.includes("already exists")) {
      userMessage = "An account with this email already exists.";
    }

    toast.error(userMessage);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setLoading(true);

    try {
      if (isLogin) {
        const result = signInSchema.safeParse({ email, password });
        if (!result.success) {
          const errors = result.error.issues.map(issue => ({
            field: issue.path[0] as string,
            message: issue.message,
          }));
          setValidationErrors(errors);
          setLoading(false);
          return;
        }

        const { data, error: authError } = await authClient.signIn.email({
          email,
          password,
        });

        if (authError) {
          handleAuthError(authError);
          setLoading(false);
          return;
        }

        if (data) {
          window.location.href = "/";
        }
      }
      else {
        const result = signUpSchema.safeParse({ name, email, password });
        if (!result.success) {
          const errors = result.error.issues.map(issue => ({
            field: issue.path[0] as string,
            message: issue.message,
          }));
          setValidationErrors(errors);
          setLoading(false);
          return;
        }

        const { error: authError } = await authClient.signUp.email({
          email,
          password,
          name,
        });

        if (authError) {
          handleAuthError(authError);
          setLoading(false);
          return;
        }

        setPendingVerification(true);
        toast.success("Account created! Please check your email to verify.");
        setLoading(false);
      }
    }
    catch (err) {
      console.error("Auth error:", err);
      toast.error("Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/",
    });
    setLoading(false);

    if (error) {
      toast.error("Failed to resend verification email.");
      return;
    }
    toast.success("Verification email sent!");
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
    <form onSubmit={handleEmailAuth} className="space-y-3">
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
