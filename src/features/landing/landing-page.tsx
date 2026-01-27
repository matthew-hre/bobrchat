"use client";

import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "~/components/ui/button";

import { ApiKeysMockup } from "./mockups/api-keys-mockup";
import { CostBreakdownMockup } from "./mockups/cost-breakdown-mockup";
import { ModelSelectorMockup } from "./mockups/model-selector-mockup";
import { ParallelSearchMockup } from "./mockups/parallel-search-mockup";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt="BobrChat Logo"
            width={64}
            height={64}
            className="size-8"
          />
          <span className="text-lg font-semibold tracking-tight">BobrChat</span>
        </div>
        <Link href="/auth">
          <Button size="sm">Sign in</Button>
        </Link>
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
              Chat with any AI model.
              <br />
              <span className="text-muted-foreground">
                Pay only what you use.
              </span>
            </h1>
            <p className="text-muted-foreground mx-auto max-w-xl text-lg">
              Bring your own API key. No model limits. No daily usage. Just a clean
              interface for the models you want to use.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/auth">
                <Button size="lg" className="gap-2">
                  Get Started
                  <ArrowRightIcon className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Bento Features Grid */}
          <div className="border-border/60 border border-dashed">
            {/* Row 1: Model Selector */}
            <div className={`
              grid grid-cols-1
              lg:grid-cols-2
            `}
            >
              <div className={`
                border-border/60 flex flex-col justify-center border-b
                border-dashed p-8
                lg:border-r
              `}
              >
                <h2 className="text-xl font-semibold">Pick your model</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Switch between GPT-5.2, Claude, Gemini, Llama, and more. See
                  capabilities at a glance.
                </p>
              </div>
              <div className={`
                border-border/60 flex items-center justify-center border-b
                border-dashed p-8
              `}
              >
                <ModelSelectorMockup />
              </div>
            </div>

            {/* Row 2: Cost Breakdown (reversed) */}
            <div className={`
              grid grid-cols-1
              lg:grid-cols-2
            `}
            >
              <div className={`
                border-border/60 order-2 flex items-center justify-center
                border-b border-dashed p-8
                lg:order-1 lg:border-r
              `}
              >
                <CostBreakdownMockup />
              </div>
              <div className={`
                border-border/60 order-1 flex flex-col justify-center border-b
                border-dashed p-8
                lg:order-2
              `}
              >
                <h2 className="text-xl font-semibold">See what you spend</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Real-time cost tracking per message. Know what you're paying
                  for tokens, search, and file processing.
                </p>
              </div>
            </div>

            {/* Row 3: API Keys */}
            <div className={`
              grid grid-cols-1
              lg:grid-cols-2
            `}
            >
              <div className={`
                border-border/60 flex flex-col justify-center border-b
                border-dashed p-8
                lg:border-r
              `}
              >
                <h2 className="text-xl font-semibold">Your keys, your choice</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Store API keys locally in your browser, or encrypted on our
                  servers. You're always in control.
                </p>
              </div>
              <div className={`
                border-border/60 flex items-center justify-center border-b
                border-dashed p-8
              `}
              >
                <ApiKeysMockup />
              </div>
            </div>

            {/* Row 4: Parallel Search */}
            <div className={`
              grid grid-cols-1
              lg:grid-cols-2
            `}
            >
              <div className={`
                border-border/60 order-2 flex items-center justify-center
                border-b border-dashed p-8
                lg:order-1 lg:border-r lg:border-b-0
              `}
              >
                <ParallelSearchMockup />
              </div>
              <div className={`
                border-border/60 order-1 flex flex-col justify-center border-b
                border-dashed p-8
                lg:order-2 lg:border-b-0
              `}
              >
                <h2 className="text-xl font-semibold">Search smarter</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Powered by Parallel.ai — the highest accuracy AI web search.
                  Search and extract content in parallel for faster answers.
                </p>
              </div>
            </div>
          </div>

          {/* Beta Note */}
          <div className="mt-20 flex flex-col items-center pt-8 text-center">
            <div className={`
              bg-primary/10 text-primary rounded-full px-3 py-1 text-xs
              font-medium
            `}
            >
              Beta
            </div>
            <h2 className="mt-3 text-xl font-semibold">Free while we figure things out</h2>
            <p className="text-muted-foreground mt-2 max-w-md text-sm">
              We&apos;re still early. Enjoy a generous free tier as a beta user. You just pay for your own API usage through OpenRouter.
            </p>
            <Link href="/auth" className="mt-6">
              <Button className="gap-2">
                Try it out
                <ArrowRightIcon className="size-4" />
              </Button>
            </Link>
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
            © 2026
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
