"use client";

import type { Model } from "@openrouter/sdk/models";

import {
  BrainIcon,
  ChevronDownIcon,
  FileTextIcon,
  FileTypeCornerIcon,
  ImageIcon,
  SearchIcon,
} from "lucide-react";
import * as React from "react";

import { getModelCapabilities } from "~/features/models";
import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

type ModelSelectorProps = {
  models: Model[];
  selectedModelId?: string;
  onSelectModelAction: (modelId: string) => void;
  className?: string;
  popoverWidth?: string;
  sideOffset?: number;
  isLoading?: boolean;
};

export function NoModelsToolip({ models, isLoading, children }: { models: Model[], isLoading?: boolean, children: React.ReactNode }) {
  if (isLoading) {
    return children;
  }

  if (models.length > 0) {
    return children;
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="text-sm">
          Set up your desired models in the settings
        </TooltipContent>
      </Tooltip>
      <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center pointer-events-none">
        <span className="absolute inline-flex size-2 rounded-full bg-primary/50 animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </div>
    </>
  );
}

export function ModelSelector({
  models,
  selectedModelId,
  onSelectModelAction,
  className,
  popoverWidth = "w-lg",
  sideOffset = 81,
  isLoading = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      // Find the form element (toolbar container)
      const form = containerRef.current?.closest("form");
      if (form) {
        setContainerWidth(form.clientWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    
    // Observe the window for resize events as backup
    window.addEventListener("resize", updateWidth);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const selectedModel = models.find(m => m.id === selectedModelId);
  const displayName = selectedModel?.name || (isLoading ? "Loading..." : "Select Model");

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative" ref={containerRef}>
        <NoModelsToolip models={models} isLoading={isLoading}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLoading || (models && models.length === 0)}
              className={cn(`
            hover:text-foreground relative
            group/model gap-1 overflow-hidden transition-all
          `, `text-muted-foreground`, className)}
            >
              <div className={`
                max-w-32 overflow-hidden whitespace-nowrap truncate
                transition-all duration-200 text-sm font-medium
                group-hover/model:ml-1
                lg:max-w-none lg:group-hover/model:ml-0 lg:ml-0
              `}>
                {displayName}
              </div>
              <ChevronDownIcon
                size={14}
                className={cn(`transition-transform shrink-0`, isOpen && !isLoading
                  ? `rotate-180`
                  : "")}
              />
            </Button>
          </PopoverTrigger>
        </NoModelsToolip>
      </div>

      <PopoverContent
        side="top"
        align="start"
        alignOffset={-9}
        sideOffset={sideOffset}
        style={containerWidth ? { width: `${containerWidth}px` } : undefined}
        className={cn("rounded-none p-2 shadow-none", popoverWidth === "w-full" ? "" : popoverWidth)}
      >
        <div className="space-y-1">
          {isLoading || !models || models.length === 0
            ? (
              <div className="text-muted-foreground py-4 text-center text-sm">
                {isLoading ? "Loading models..." : "No models available"}
              </div>
            )
            : (
              models.map((model) => {
                const capabilities = getModelCapabilities(model);
                return (
                  <Button
                    key={model.id}
                    variant="ghost"
                    onClick={() => {
                      onSelectModelAction(model.id);
                      setIsOpen(false);
                    }}
                    className={cn(`
                        h-12 w-full justify-between rounded px-2 py-2 text-left
                        transition-colors
                      `, selectedModelId === model.id
                      ? "bg-primary/10 text-primary"
                      : `
                          hover:bg-muted hover:text-foreground
                          text-muted-foreground
                        `)}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {model.name}
                      </div>
                      <div className="text-xs opacity-75">
                        {model.id}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {capabilities.supportsImages && (
                        <span title="Image upload">
                          <ImageIcon size={14} className="shrink-0" />
                        </span>
                      )}
                      {capabilities.supportsNativePdf && (
                        <span title="PDF upload (native)">
                          <FileTextIcon size={14} className="shrink-0" />
                        </span>
                      )}
                      {capabilities.supportsPdf && !capabilities.supportsNativePdf && (
                        <span title="PDF upload (via OpenRouter)">
                          <FileTypeCornerIcon size={14} className="shrink-0" />
                        </span>
                      )}
                      {capabilities.supportsReasoning && (
                        <span title="Reasoning">
                          <BrainIcon size={14} className="shrink-0" />
                        </span>
                      )}
                      {capabilities.supportsSearch && (
                        <span title="Search & tools">
                          <SearchIcon size={14} className="shrink-0" />
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
