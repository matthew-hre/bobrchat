import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { auth } from "~/features/auth/lib/auth";
import { PricingCards } from "~/features/subscriptions/components/pricing-cards";
import { getUserTier } from "~/features/subscriptions/queries";

export const metadata = {
  title: "Pricing - BobrChat",
  description: "Choose the plan that works best for you",
};

export default async function PricingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const currentTier = session?.user ? await getUserTier(session.user.id) : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt="BobrChat Logo"
            width={64}
            height={64}
            className="size-8"
          />
          <span className="text-lg font-semibold tracking-tight">BobrChat</span>
        </Link>
        {session?.user
          ? (
              <Link href="/settings?tab=subscription">
                <Button variant="outline" size="sm">Settings</Button>
              </Link>
            )
          : (
              <Link href="/auth">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center px-6 py-16">
        <div className="w-full max-w-4xl">
          {/* Hero */}
          <div className="mb-16 space-y-6 text-center">
            <h1 className={`
              text-4xl font-bold tracking-tight
              sm:text-5xl
            `}
            >
              Simple, transparent pricing.
              <br />
              <span className="text-muted-foreground">
                No surprises.
              </span>
            </h1>
            <p className="text-muted-foreground mx-auto max-w-xl text-lg">
              Choose the plan that works best for you. Upgrade or downgrade anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="border-border/60 border border-dashed">
            <PricingCards currentTier={currentTier} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-muted-foreground px-6 py-8 text-center text-xs">
        <div className={`
          flex flex-col justify-center gap-2
          md:flex-row
        `}
        >
          <p>
            ©
            {" "}
            2026
            {" "}
            <Link
              href="https://matthew-hre.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                text-primary
                hover:underline
              `}
            >
              Matthew Hrehirchuk
            </Link>
          </p>
          <span className={`
            hidden
            md:inline-block
          `}
          >
            •
          </span>
          <p>
            <Link
              href="/privacy"
              className={`
                hover:text-foreground
                transition-colors
              `}
            >
              Privacy Policy
            </Link>
          </p>
          <span className={`
            hidden
            md:inline-block
          `}
          >
            •
          </span>
          <Link
            href="https://github.com/matthew-hre/bobrchat/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className={`
              hover:text-foreground
              transition-colors
            `}
          >
            BSL 1.1 License
          </Link>
        </div>
      </footer>
    </div>
  );
}
