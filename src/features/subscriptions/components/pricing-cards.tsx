"use client";

import { CheckIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { SubscriptionTier } from "~/lib/db/schema/subscriptions";

import { Button } from "~/components/ui/button";
import { authClient } from "~/features/auth/lib/auth-client";
import { getPolarProductId } from "~/features/subscriptions/actions";
import { cn } from "~/lib/utils";

type TierConfig = {
  id: SubscriptionTier;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  checkoutTier?: "plus" | "pro";
};

const TIERS: TierConfig[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "Get started with basic features",
    features: [
      "100 threads",
      "10 MB storage",
      "Community support",
      "Message Encryption",
      "Bring Your Own Key support",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "$2.99/mo",
    description: "For power users who need more",
    features: [
      "Unlimited threads",
      "100 MB storage",
      "Priority support",
      "Message Encryption",
      "Bring Your Own Key support",
    ],
    highlighted: true,
    checkoutTier: "plus",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$5.99/mo",
    description: "For AI experts and professionals",
    features: [
      "Unlimited threads",
      "1 GB storage",
      "Priority support",
      "Message Encryption",
      "Bring Your Own Key support",
    ],
    checkoutTier: "pro",
  },
];

type PricingCardsProps = {
  currentTier?: SubscriptionTier;
};

export function PricingCards({ currentTier }: PricingCardsProps) {
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
    <div className={`
      grid grid-cols-1 divide-y divide-dashed
      md:grid-cols-3 md:divide-x md:divide-y-0
    `}
    >
      {TIERS.map((tier) => {
        const isCurrent = currentTier === tier.id;
        const isBetaOnPlus = currentTier === "beta" && tier.id === "plus";

        return (
          <div
            key={tier.id}
            className={cn(
              "relative flex flex-col p-6",
              tier.highlighted && "bg-primary/5",
            )}
          >
            {tier.highlighted && !isBetaOnPlus && (
              <div className={`
                bg-primary text-background absolute -top-3 left-1/2
                -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium
              `}
              >
                Popular
              </div>
            )}

            {isBetaOnPlus && (
              <div className={`
                bg-primary text-background absolute -top-3 left-1/2 w-max
                -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium
              `}
              >
                Beta - you get this for free!
              </div>
            )}

            {isCurrent && (
              <div className={`
                bg-muted text-muted-foreground absolute -top-3 right-4
                rounded-full px-3 py-1 text-xs font-medium
              `}
              >
                Current Plan
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-xl font-semibold">{tier.name}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{tier.description}</p>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold">{tier.price.split("/")[0]}</span>
              {tier.price.includes("/") && (
                <span className="text-muted-foreground text-sm">
                  /
                  {tier.price.split("/")[1]}
                </span>
              )}
            </div>

            <ul className="mb-6 flex-1 space-y-3">
              {tier.features.map(feature => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckIcon className="text-primary size-4 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {tier.checkoutTier
              ? (
                  <Button
                    onClick={() => handleCheckout(tier.checkoutTier!)}
                    disabled={isCheckingOut !== null || isCurrent || isBetaOnPlus}
                    variant={tier.highlighted ? "default" : "outline"}
                    className="w-full"
                  >
                    {isCheckingOut === tier.checkoutTier
                      ? (
                          "Redirecting..."
                        )
                      : isCurrent || isBetaOnPlus
                        ? (
                            "Current Plan"
                          )
                        : (
                            <>
                              <SparklesIcon className="size-4" />
                              Upgrade to
                              {" "}
                              {tier.name}
                            </>
                          )}
                  </Button>
                )
              : (
                  <Button variant="outline" disabled className="w-full">
                    {isCurrent ? "Current Plan" : "Free Forever"}
                  </Button>
                )}
          </div>
        );
      })}
    </div>
  );
}
