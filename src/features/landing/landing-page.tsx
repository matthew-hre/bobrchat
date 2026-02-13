import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
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

          {/* FAQs */}
          <div className="mx-auto mt-20 w-full max-w-2xl">
            <h2 className="mb-6 text-center text-xl font-semibold">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-0">
                <AccordionTrigger>Is this actually cheaper?</AccordionTrigger>
                <AccordionContent>
                  For most users, yes. The average user spends around $5-$10 per
                  month on AI usage. Most paid AI chat services charge a flat fee
                  of $20 or more, regardless of usage. With BobrChat, you only pay
                  for what you use.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-1">
                <AccordionTrigger>How does "Pay only what you use" work?</AccordionTrigger>
                <AccordionContent>
                  Paid AI services usually charge a flat $20 monthly fee, whether you send one message or one thousand. BobrChat connects to your OpenRouter account, which bills you by the token. If you only spend $4 on tokens this month, you only pay $4.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger>Is it safe to give you my API key?</AccordionTrigger>
                <AccordionContent>
                  Yes. You control how your data is handled. If you choose "Browser Only," your key stays in your local storage and is never stored on our servers. If you choose "Encrypted Server," your key is encrypted before being stored so you can use it across different devices.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-3">
                <AccordionTrigger>Can I use providers other than OpenRouter?</AccordionTrigger>
                <AccordionContent>
                  Currently, we support OpenRouter for access to hundreds of models with one key. We are actively adding support for other providers like Anthropic, OpenAI, and Google Gemini. This will allow you to use your existing credits or tier-status directly with those official APIs.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-4">
                <AccordionTrigger>Why would I use this instead of OpenRouter's chat?</AccordionTrigger>
                <AccordionContent>
                  Personal preference. OpenRouter's interface is great, however it's overkill for the average chat experience. BobrChat focuses on a clean, simple chat UI with essential features like cost tracking, model switching, and file uploads.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Pricing */}
          <div className="mt-20 flex flex-col items-center text-center">
            <h2 className="text-xl font-semibold">Pricing</h2>

            <div className={`
              border-border/60 mt-8 grid w-full max-w-2xl grid-cols-1 border
              border-dashed
              md:grid-cols-2
            `}
            >
              <div className={`
                border-border/60 flex flex-col border-b border-dashed p-6
                text-left
                md:border-r md:border-b-0
              `}
              >
                <h3 className="font-semibold">Free</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Everything you need to get started.
                </p>
                <div className="mt-4 mb-4">
                  <span className="text-3xl font-bold">$0</span>
                </div>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li>100 threads</li>
                  <li>10 MB storage</li>
                </ul>
                <Link href="/auth" className="mt-auto">
                  <Button variant="outline" className="w-full gap-2">
                    Get Started
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </Link>
              </div>

              <div className="bg-primary/5 relative flex flex-col p-6 text-left">
                <div className={`
                  bg-primary text-background absolute -top-3 left-6 rounded-full
                  px-3 py-0.5 text-xs font-medium
                `}
                >
                  Recommended
                </div>
                <h3 className="font-semibold">Plus</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  For power users who need more.
                </p>
                <div className="mt-4 mb-4">
                  <span className="text-3xl font-bold">$2.99</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li>
                    <b>Unlimited</b>
                    {" "}
                    threads
                  </li>
                  <li>
                    <b>100 MB</b>
                    {" "}
                    storage
                  </li>
                  <li>Priority support</li>
                </ul>
                <Link href="/auth" className="mt-auto pt-6">
                  <Button className="w-full gap-2">
                    Get Started
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 max-w-lg text-sm">
              Both plans include encrypted messages and Bring Your Own Key support.
              You always pay for your own API usage through OpenRouter.
            </p>
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
