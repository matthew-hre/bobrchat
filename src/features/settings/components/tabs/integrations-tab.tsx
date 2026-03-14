"use client";

import { Accordion } from "~/components/ui/accordion";
import { Skeleton } from "~/components/ui/skeleton";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

import type { ApiKeyConfig } from "./api-key-section";

import { ApiKeySection } from "./api-key-section";

const modelProviders: ApiKeyConfig[] = [
  {
    provider: "openrouter",
    label: "OpenRouter",
    description: "OpenRouter provides access to a variety of AI models.",
    placeholder: "sk-or-v1-...",
    logo: "/logos/providers/openrouter.svg",
    link: { href: "https://openrouter.ai/keys", label: "openrouter.ai/keys" },
  },
  {
    provider: "openai",
    label: "OpenAI",
    description: "Use your OpenAI API key for direct access to GPT models without going through OpenRouter.",
    placeholder: "sk-...",
    logo: "/logos/providers/openai.svg",
    link: { href: "https://platform.openai.com/api-keys", label: "platform.openai.com/api-keys" },
  },
];

const searchProviders: ApiKeyConfig[] = [
  {
    provider: "parallel",
    label: "Parallel.ai",
    description: "Parallel Search lets your AI access and search the live web in real-time to answer your questions more accurately.",
    placeholder: "pr_...",
    logo: "/logos/parallel.svg",
    link: { href: "https://platform.parallel.ai/settings?tab=api-keys", label: "platform.parallel.ai/settings" },
  },
];

export function IntegrationsTab() {
  const { isLoading } = useUserSettings({ enabled: true });

  if (isLoading) {
    return <IntegrationsTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-6 p-6">
        <section className="space-y-2">
          <h4 className={`
            text-muted-foreground text-xs font-medium tracking-wide uppercase
          `}
          >
            Model Providers
          </h4>
          <Accordion type="multiple">
            {modelProviders.map(config => (
              <ApiKeySection key={config.provider} config={config} />
            ))}
          </Accordion>
        </section>

        <section className="space-y-2">
          <h4 className={`
            text-muted-foreground text-xs font-medium tracking-wide uppercase
          `}
          >
            Search Providers
          </h4>
          <Accordion type="multiple">
            {searchProviders.map(config => (
              <ApiKeySection key={config.provider} config={config} />
            ))}
          </Accordion>
        </section>
      </div>
    </div>
  );
}

function IntegrationsTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-6 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5" />
            <Skeleton className="h-5 w-36" />
          </div>

          <Skeleton className="h-12 w-full" />

          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-3 w-48" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
      </div>
    </div>
  );
}
