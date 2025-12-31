"use client";

import { LoginForm } from "~/components/auth/login-form";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";

type AuthDialogProps = {
  open?: boolean;
  showCloseButton?: boolean;
};

export function AuthDialog({ open = true, showCloseButton = false }: AuthDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm p-4" showCloseButton={showCloseButton}>
        <DialogTitle className="sr-only">BobrChat Auth</DialogTitle>
        <LoginForm />
      </DialogContent>
    </Dialog>
  );
}
