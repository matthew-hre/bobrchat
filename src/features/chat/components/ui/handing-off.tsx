"use client";

import { AlertCircle, ExternalLink, GitBranch, Loader2, StopCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";

export type HandingOffProps = {
  id?: string;
  isHandingOff?: boolean;
  newThreadId?: string;
  generatedPrompt?: string;
  error?: string;
  stopped?: boolean;
  isActiveSession?: boolean;
};

export function HandingOff({
  id,
  isHandingOff,
  newThreadId,
  generatedPrompt,
  error,
  stopped,
  isActiveSession,
}: HandingOffProps) {
  const router = useRouter();
  const hasNavigated = useRef(false);
  const wasHandingOff = useRef(false);

  // Track if we were actively handing off (to know when it completes)
  useEffect(() => {
    if (isHandingOff) {
      wasHandingOff.current = true;
    }
  }, [isHandingOff]);

  // Only navigate if this is an active session AND we just finished handing off
  useEffect(() => {
    if (
      isActiveSession
      && wasHandingOff.current
      && newThreadId
      && generatedPrompt
      && !error
      && !stopped
      && !hasNavigated.current
    ) {
      hasNavigated.current = true;
      // Store the prompt in sessionStorage for the new thread to pick up
      sessionStorage.setItem(`handoff_${newThreadId}`, generatedPrompt);
      router.push(`/chat/${newThreadId}`);
    }
  }, [isActiveSession, newThreadId, generatedPrompt, error, stopped, router]);

  if (!isHandingOff && !newThreadId && !error && !stopped) {
    return null;
  }

  const getIcon = () => {
    if (error) return <AlertCircle className="text-destructive h-4 w-4" />;
    if (stopped) return <StopCircle className="text-muted-foreground h-4 w-4" />;
    if (isHandingOff) return <Loader2 className="h-4 w-4 animate-spin" />;
    return <GitBranch className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (error) return "Handoff failed";
    if (stopped) return "Handoff stopped";
    if (isHandingOff) return "Handing off...";
    return "Handed off";
  };

  return (
    <div className="mt-2 flex w-full flex-1 text-xs">
      <Accordion type="single" collapsible className="w-full flex-1" id={id}>
        <AccordionItem value={id ?? "handoff"}>
          <AccordionTrigger
            className={`
              flex flex-row items-center justify-start gap-2 pt-0 pb-1
            `}
          >
            {getIcon()}
            <span className={`font-medium ${error ? "text-destructive" : ""}`}>
              {getLabel()}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {error ? (
              <div className="text-destructive p-2 text-sm">{error}</div>
            ) : newThreadId ? (
              <div className="flex flex-col gap-2 text-sm">
                <Link
                  href={`/chat/${newThreadId}`}
                  className={`
                    text-primary flex w-full flex-row items-center gap-2
                    hover:underline
                  `}
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Open new thread</span>
                </Link>
                {generatedPrompt && (
                  <div className="text-muted-foreground mt-1 rounded border p-2 text-xs">
                    <div className="mb-1 font-medium">Generated prompt:</div>
                    <div className="line-clamp-3">{generatedPrompt}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground p-2 text-sm italic">
                Preparing handoff...
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
