"use client";

import type { LucideIcon } from "lucide-react";

import { LoaderIcon } from "lucide-react";
import { useState } from "react";

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
import { Label } from "~/components/ui/label";

type ConfirmationDialogProps = {
  trigger: React.ReactNode;
  title: string;
  description: string;
  icon?: LucideIcon;
  confirmLabel: string;
  loadingLabel?: string;
  onConfirm: () => Promise<void>;
  variant?: "default" | "destructive";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} & (
  | { confirmationType?: "simple" }
  | { confirmationType: "password"; passwordLabel?: string }
  | { confirmationType: "text"; confirmText: string; confirmTextLabel?: string }
);

export function ConfirmationDialog(props: ConfirmationDialogProps) {
  const {
    trigger,
    title,
    description,
    icon: Icon,
    confirmLabel,
    loadingLabel,
    onConfirm,
    variant = "default",
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
  } = props;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setUncontrolledOpen;

  const confirmationType = props.confirmationType ?? "simple";

  const canConfirm = (() => {
    if (confirmationType === "simple") return true;
    if (confirmationType === "password") return inputValue.length > 0;
    if (confirmationType === "text" && "confirmText" in props) {
      return inputValue === props.confirmText;
    }
    return false;
  })();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setInputValue("");
    }
  };

  const renderInput = () => {
    if (confirmationType === "password") {
      const label = ("passwordLabel" in props && props.passwordLabel) || "Password";
      return (
        <div className="space-y-2">
          <Label htmlFor="confirmation-password">{label}</Label>
          <Input
            id="confirmation-password"
            type="password"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={`Enter your ${label.toLowerCase()}`}
            autoComplete="current-password"
          />
        </div>
      );
    }

    if (confirmationType === "text" && "confirmText" in props) {
      const confirmText = props.confirmText;
      const label = ("confirmTextLabel" in props && props.confirmTextLabel) ?? (
        <>
          Type <span className="font-mono font-bold">{confirmText}</span> to confirm
        </>
      );
      return (
        <div className="space-y-2">
          <Label htmlFor="confirmation-text">{label}</Label>
          <Input
            id="confirmation-text"
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={confirmText}
            autoComplete="off"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className={`size-5 ${variant === "destructive" ? "text-destructive" : ""}`} />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {renderInput()}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            {loading
              ? (
                  <>
                    <LoaderIcon className="size-4 animate-spin" />
                    {loadingLabel ?? "Loading..."}
                  </>
                )
              : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
