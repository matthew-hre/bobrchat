"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { ValidationError } from "~/features/auth/types";

import { authClient, twoFactor } from "~/features/auth/lib/auth-client";
import { validateSignIn, validateSignUp } from "~/features/auth/validation";

export function useAuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pending2FA, setPending2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(e => e.field === field)?.message;
  };

  const handleAuthError = (error: { code?: string; message?: string; status?: number; statusText?: string }): boolean => {
    if (error.code === "EMAIL_NOT_VERIFIED") {
      setPendingVerification(true);
      toast.info("Please check your email to verify your account.");
      return true;
    }

    if (error.code === "TWO_FACTOR_REQUIRED") {
      setPending2FA(true);
      return true;
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
    return false;
  };

  const handleSignIn = async () => {
    setValidationErrors([]);
    setLoading(true);

    try {
      const result = validateSignIn({ email, password });
      if (!result.success) {
        const errors = result.error.issues.map(issue => ({
          field: issue.path[0] as string,
          message: issue.message,
        }));
        setValidationErrors(errors);
        setLoading(false);
        return false;
      }

      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        handleAuthError(authError);
        setLoading(false);
        return false;
      }

      if (data) {
        // Check if 2FA is required (better-auth returns twoFactorRedirect: true)
        if ("twoFactorRedirect" in data && data.twoFactorRedirect) {
          setPending2FA(true);
          setLoading(false);
          return true;
        }

        window.location.href = "/";
        return true;
      }
    }
    catch (err) {
      console.error("Auth error:", err);
      toast.error("Authentication failed. Please try again.");
      setLoading(false);
    }
    return false;
  };

  const handleSignUp = async () => {
    setValidationErrors([]);
    setLoading(true);

    try {
      const result = validateSignUp({ name, email, password });
      if (!result.success) {
        const errors = result.error.issues.map(issue => ({
          field: issue.path[0] as string,
          message: issue.message,
        }));
        setValidationErrors(errors);
        setLoading(false);
        return false;
      }

      const { error: authError } = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (authError) {
        handleAuthError(authError);
        setLoading(false);
        return false;
      }

      setPendingVerification(true);
      toast.success("Account created! Please check your email to verify.");
      setLoading(false);
      return true;
    }
    catch (err) {
      console.error("Auth error:", err);
      toast.error("Authentication failed. Please try again.");
      setLoading(false);
    }
    return false;
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
      return false;
    }
    toast.success("Verification email sent!");
    return true;
  };

  const handleVerify2FA = async () => {
    if (totpCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return false;
    }

    setLoading(true);
    const result = await twoFactor.verifyTotp({
      code: totpCode,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error.message || "Invalid verification code");
      return false;
    }

    window.location.href = "/";
    return true;
  };

  const handleVerifyBackupCode = async (code: string) => {
    setLoading(true);
    const result = await twoFactor.verifyBackupCode({
      code,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error.message || "Invalid backup code");
      return false;
    }

    window.location.href = "/";
    return true;
  };

  const reset2FA = () => {
    setPending2FA(false);
    setTotpCode("");
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    validationErrors,
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
  };
}
