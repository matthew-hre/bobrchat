"use client";

import { LoaderIcon, MailIcon } from "lucide-react";
import { useState } from "react";
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
import { Label } from "~/components/ui/label";
import { authClient, useSession } from "~/features/auth/lib/auth-client";

export function ChangeEmailSection() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setNewEmail("");
  };

  const canSubmit
    = newEmail.trim() !== ""
      && newEmail !== session?.user?.email;

  const handleChangeEmail = async () => {
    if (!canSubmit)
      return;

    setLoading(true);
    const { error } = await authClient.changeEmail({
      newEmail: newEmail.trim(),
      callbackURL: "/settings",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to change email");
      return;
    }

    toast.success("Verification email sent to your new address");
    resetForm();
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>Email</Label>
      <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen)
              resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <MailIcon className="size-4" />
              Change Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailIcon className="size-5" />
                Change Email
              </DialogTitle>
              <DialogDescription>
                Enter your new email address. A verification link will be sent to confirm the change.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-email">Current Email</Label>
                <Input
                  id="current-email"
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-email">New Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  autoComplete="email"
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleChangeEmail}
                disabled={!canSubmit || loading}
              >
                {loading
                  ? (
                      <>
                        <LoaderIcon className="size-4 animate-spin" />
                        Sending...
                      </>
                    )
                  : (
                      "Send Verification"
                    )}
              </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      <p className="text-muted-foreground text-xs">
        Update your account email address.
      </p>
    </div>
  );
}
