"use client";

import { AlertTriangleIcon, CheckIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { authClient } from "~/features/auth/lib/auth-client";
import { getPolarProductId } from "~/features/subscriptions/actions";

type UpgradePromptDialogProps = {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  currentUsage: number;
  limit: number;
};

const PLUS_FEATURES = {
  name: "Plus",
  price: "$2.99/mo",
  features: ["Unlimited threads", "100 MB storage", "Priority support"],
};

export function UpgradePromptDialog({
  open,
  onOpenChangeAction,
  currentUsage,
  limit,
}: UpgradePromptDialogProps) {
  const [isCheckingOut, setIsCheckingOut] = useState<"plus" | null>(null);

  const handleCheckout = async (tier: "plus") => {
    setIsCheckingOut(tier);
    try {
      const productId = await getPolarProductId(tier);
      if (!productId) {
        toast.error("Payments are not configured. Please contact support.");
        return;
      }
      await authClient.checkout({ products: [productId] });
    }
    catch {
      toast.error("Failed to start checkout. Please try again.");
    }
    finally {
      setIsCheckingOut(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="text-warning size-5" />
            Thread Limit Reached
          </DialogTitle>
          <DialogDescription>
            You&apos;ve used
            {" "}
            {currentUsage}
            {" "}
            of
            {" "}
            {limit}
            {" "}
            threads on the free plan.
            Upgrade to continue creating new threads.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto max-w-xs py-4">
          <div
            className={`
              border-border bg-muted/30 flex flex-col rounded-lg border p-4
            `}
          >
            <div className="mb-3">
              <h3 className="font-semibold">{PLUS_FEATURES.name}</h3>
              <p className="text-primary text-lg font-bold">
                {PLUS_FEATURES.price}
              </p>
            </div>
            <ul className="mb-4 flex-1 space-y-2 text-sm">
              {PLUS_FEATURES.features.map(feature => (
                <li key={feature} className="flex items-center gap-2">
                  <CheckIcon className="text-primary size-4" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleCheckout("plus")}
              disabled={isCheckingOut !== null}
              className="w-full"
            >
              {isCheckingOut === "plus"
                ? (
                    "Redirecting..."
                  )
                : (
                    <>
                      <SparklesIcon className="size-4" />
                      Upgrade to
                      {" "}
                      {PLUS_FEATURES.name}
                    </>
                  )}
            </Button>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" asChild>
            <Link href="/settings?tab=preferences">Manage threads</Link>
          </Button>
          <Button variant="outline" onClick={() => onOpenChangeAction(false)}>
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
