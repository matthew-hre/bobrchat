"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { ValidationError } from "~/features/auth/types";

import { authClient } from "~/features/auth/lib/auth-client";
import { signInSchema, signUpSchema } from "~/features/auth/types";

export function useAuthForm() {
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

  const handleSignIn = async () => {
    setValidationErrors([]);
    setLoading(true);

    try {
      const result = signInSchema.safeParse({ email, password });
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
      const result = signUpSchema.safeParse({ name, email, password });
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
    getFieldError,
    handleSignIn,
    handleSignUp,
    handleResendVerification,
  };
}
