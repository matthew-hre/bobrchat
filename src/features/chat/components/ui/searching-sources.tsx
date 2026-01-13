"use client";

import { ExternalLink, Globe, Loader2 } from "lucide-react";
import Link from "next/link";

import type { SourceInfo } from "~/app/api/chat/route";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";

export function SearchingSources({ sources, isSearching }: { sources: SourceInfo[]; isSearching?: boolean }) {
  if (!sources.length && !isSearching)
    return null;

  return (
    <div className="mt-2 flex w-full flex-1 text-xs">
      <Accordion type="single" collapsible className="w-full flex-1">
        <AccordionItem value="sources">
          <AccordionTrigger className={`
            flex flex-row items-center justify-start gap-2 pt-0 pb-1
          `}
          >
            {isSearching
              ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )
              : (
                  <Globe className="h-4 w-4" />
                )}
            <span className="font-medium">
              {isSearching ? "Searching the web..." : "Sources used"}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {sources.length > 0
              ? (
                  <div className="flex flex-col gap-1 text-sm">
                    {sources.map(source => (
                      source.sourceType === "url" && source.url
                        ? (
                            <Link
                              key={source.id}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`
                                text-primary flex w-full flex-row items-center
                                gap-2
                                hover:underline
                              `}
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="flex-1 truncate">{source.title || source.url}</span>
                            </Link>
                          )
                        : (
                            <span
                              key={source.id}
                              className="text-muted-foreground"
                            >
                              {source.title || "Unknown source"}
                            </span>
                          )
                    ))}
                  </div>
                )
              : (
                  <div className="text-muted-foreground p-2 text-sm italic">
                    Finding relevant sources...
                  </div>
                )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
