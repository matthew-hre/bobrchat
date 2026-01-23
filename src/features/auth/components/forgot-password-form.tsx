"use client";

import { LoaderIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/features/auth/lib/auth-client";

export function ForgotPasswordForm({
  onBack,
}: {
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/auth/reset-password",
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to send reset email. Please try again.");
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm">
          If an account exists for
          {" "}
          <strong>{email}</strong>
          , we sent a password reset link.
        </p>
        <p className="text-muted-foreground text-xs">
          Please check your inbox and click the link to reset your password.
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={onBack}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Sending...
              </>
            )
          : "Send reset link"}
      </Button>

      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        Back to sign in
      </Button>
    </form>
  );
}
