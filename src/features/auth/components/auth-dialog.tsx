"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";

import { ForgotPasswordForm } from "./forgot-password-form";
import { GitHubAuth } from "./github-auth";
import { LoginForm } from "./login-form";

type AuthDialogProps = {
  open?: boolean;
  showCloseButton?: boolean;
};

type AuthView = "login" | "signup" | "forgot-password";

export function AuthDialog({ open = true, showCloseButton = false }: AuthDialogProps) {
  const searchParams = useSearchParams();
  const initialView = searchParams.get("view") === "login" ? "login" : "signup";
  const [view, setView] = useState<AuthView>(initialView);
  const [pending2FA, setPending2FA] = useState(false);

  const getTitle = () => {
    switch (view) {
      case "login":
        return "Welcome back";
      case "signup":
        return "Create an account";
      case "forgot-password":
        return "Reset your password";
    }
  };

  const getDescription = () => {
    switch (view) {
      case "login":
        return "Sign in to continue to BobrChat";
      case "signup":
        return "Stop paying for subscriptions you don't finish. Most platforms charge a flat fee for limits you never hit. BobrChat changes that.";
      case "forgot-password":
        return "Enter your email and we'll send you a reset link.";
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm p-4" showCloseButton={showCloseButton}>
        <DialogTitle className="sr-only">BobrChat Auth</DialogTitle>
        <div className="space-y-4">
          {!pending2FA && (
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
              <h1 className="text-lg font-semibold">{getTitle()}</h1>
              <p className="text-muted-foreground px-8 pt-2 text-sm">
                {getDescription()}
              </p>
            </div>
          )}

          {view === "forgot-password"
            ? (
                <ForgotPasswordForm onBack={() => setView("login")} />
              )
            : (
                <>
                  <LoginForm
                    isLogin={view === "login"}
                    onForgotPassword={() => setView("forgot-password")}
                    onPending2FAChange={setPending2FA}
                  />
                  {!pending2FA && (
                    <>
                      <AuthOptionsSeparator />
                      <GitHubAuth />
                      <p className="text-muted-foreground text-center text-sm">
                        {view === "login" ? "Don't have an account? " : "Already have an account? "}
                        <AuthToggleButton
                          isLogin={view === "login"}
                          onClickAction={() => setView(view === "login" ? "signup" : "login")}
                        />
                      </p>
                    </>
                  )}
                </>
              )}

          {!pending2FA && (
            <p className="text-muted-foreground text-center text-xs">
              This app is an experiment. We don't bill you for AI usage. We may introduce billing for storage in the future. You bring your own API key and pay providers directly for the tokens you actually use.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AuthOptionsSeparator() {
  return (
    <div className="relative">
      <Separator />
      <span
        className={`
          bg-background text-muted-foreground absolute top-1/2 left-1/2
          -translate-x-1/2 -translate-y-1/2 px-2 text-xs
        `}
      >
        or
      </span>
    </div>
  );
}

export function AuthToggleButton({
  isLogin,
  onClickAction,
}: {
  isLogin: boolean;
  onClickAction: () => void;
}) {
  return (
    <Button
      variant="link"
      size="sm"
      onClick={onClickAction}
      className="px-0"
    >
      {isLogin ? "Sign up" : "Sign in"}
    </Button>
  );
}
