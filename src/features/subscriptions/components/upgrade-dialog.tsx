"use client";

import { CheckIcon, SparklesIcon } from "lucide-react";
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

type UpgradeDialogProps = {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
};

const PLUS_FEATURES = {
  name: "Plus",
  price: "$2.99",
  period: "mo",
  features: [
    "Unlimited threads",
    "100 MB storage",
    "Priority support",
  ],
};

export function UpgradeDialog({ open, onOpenChangeAction }: UpgradeDialogProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const productId = await getPolarProductId("plus");
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
      setIsCheckingOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Upgrade to Plus</DialogTitle>
          <DialogDescription>
            Unlock the full BobrChat experience.
          </DialogDescription>
        </DialogHeader>

        <div className="pb-2">
          <div className="mb-2">
            <span className="text-3xl font-bold">{PLUS_FEATURES.price}</span>
            <span className="text-muted-foreground text-sm">
              /
              {PLUS_FEATURES.period}
            </span>
          </div>

          <ul className="space-y-2.5">
            {PLUS_FEATURES.features.map(feature => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <CheckIcon className="text-primary size-4 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className={`
          flex-col gap-2
          sm:flex-col
        `}
        >
          <Button
            onClick={handleCheckout}
            disabled={isCheckingOut}
            className="w-full"
          >
            {isCheckingOut
              ? "Redirecting..."
              : (
                  <>
                    <SparklesIcon className="size-4" />
                    Continue to checkout
                  </>
                )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChangeAction(false)}
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
