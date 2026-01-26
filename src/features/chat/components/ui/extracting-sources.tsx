"use client";

import { AlertCircle, ExternalLink, FileText, Loader2, StopCircle } from "lucide-react";
import Link from "next/link";

import type { NormalizedSource } from "~/features/chat/ui/parts/normalize";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";

export function ExtractingSources({ sources, isExtracting, error, stopped, id }: { sources: NormalizedSource[]; isExtracting?: boolean; error?: string; stopped?: boolean; id?: string }) {
  if (!sources.length && !isExtracting && !error && !stopped)
    return null;

  const getIcon = () => {
    if (error) return <AlertCircle className="text-destructive h-4 w-4" />;
    if (stopped) return <StopCircle className="text-muted-foreground h-4 w-4" />;
    if (isExtracting) return <Loader2 className="h-4 w-4 animate-spin" />;
    return <FileText className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (error) return "Extraction failed";
    if (stopped) return "Extraction stopped";
    if (isExtracting) return "Extracting content...";
    return "Extracted pages";
  };

  return (
    <div className="mt-2 flex w-full flex-1 text-xs">
      <Accordion type="single" collapsible className="w-full flex-1" id={id}>
        <AccordionItem value={id ?? "extract-sources"}>
          <AccordionTrigger className={`
            flex flex-row items-center justify-start gap-2 pt-0 pb-1
          `}
          >
            {getIcon()}
            <span className={`font-medium ${error ? "text-destructive" : ""}`}>
              {getLabel()}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {error
              ? (
                  <div className="text-destructive p-2 text-sm">
                    {error}
                  </div>
                )
              : sources.length > 0
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
                      Extracting page content...
                    </div>
                  )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
