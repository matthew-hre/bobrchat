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
  onOpenChange: (open: boolean) => void;
  currentUsage: number;
  limit: number;
};

const TIER_FEATURES = {
  plus: {
    name: "Plus",
    price: "$2.99/mo",
    features: ["Unlimited threads", "100 MB storage", "Priority support"],
  },
  pro: {
    name: "Pro",
    price: "$5.99/mo",
    features: ["Unlimited threads", "1 GB storage", "Bring your own storage", "Priority support"],
  },
};

export function UpgradePromptDialog({
  open,
  onOpenChange,
  currentUsage,
  limit,
}: UpgradePromptDialogProps) {
  const [isCheckingOut, setIsCheckingOut] = useState<"plus" | "pro" | null>(null);

  const handleCheckout = async (tier: "plus" | "pro") => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            Upgrade to continue creating new conversations.
          </DialogDescription>
        </DialogHeader>

        <div className={`
          grid gap-4 py-4
          sm:grid-cols-2
        `}
        >
          {(["plus", "pro"] as const).map(tier => (
            <div
              key={tier}
              className={`
                border-border bg-muted/30 flex flex-col rounded-lg border p-4
              `}
            >
              <div className="mb-3">
                <h3 className="font-semibold">{TIER_FEATURES[tier].name}</h3>
                <p className="text-primary text-lg font-bold">
                  {TIER_FEATURES[tier].price}
                </p>
              </div>
              <ul className="mb-4 flex-1 space-y-2 text-sm">
                {TIER_FEATURES[tier].features.map(feature => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckIcon className="text-primary size-4" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleCheckout(tier)}
                disabled={isCheckingOut !== null}
                className="w-full"
              >
                {isCheckingOut === tier
                  ? (
                      "Redirecting..."
                    )
                  : (
                      <>
                        <SparklesIcon className="size-4" />
                        Upgrade to
                        {" "}
                        {TIER_FEATURES[tier].name}
                      </>
                    )}
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" asChild>
            <Link href="/settings?tab=preferences">Manage threads</Link>
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
