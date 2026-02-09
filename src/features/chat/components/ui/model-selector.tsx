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

import { getModelCapabilities, ProviderLogo, formatModelName } from "~/features/models";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";
import { useChatUIStore } from "~/features/chat/store";
import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
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
  useLocalState?: boolean;
};

export function NoModelsToolip({ models, isLoading, children }: { models: Model[]; isLoading?: boolean; children: React.ReactNode }) {
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
  useLocalState = false,
}: ModelSelectorProps) {
  const { data: settings } = useUserSettings();
  const globalOpen = useChatUIStore(s => s.modelSelectorOpen);
  const setGlobalOpen = useChatUIStore(s => s.setModelSelectorOpen);
  const setModelSelectorOverride = useChatUIStore(s => s.setModelSelectorOverride);
  const [localOpen, setLocalOpen] = React.useState(false);

  const open = useLocalState ? localOpen : globalOpen;
  const setOpen = useLocalState ? setLocalOpen : setGlobalOpen;

  React.useEffect(() => {
    if (!useLocalState) return;
    setModelSelectorOverride(() => setLocalOpen(true));
    return () => setModelSelectorOverride(null);
  }, [useLocalState, setModelSelectorOverride]);

  const [containerWidth, setContainerWidth] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = React.useState(false);
  const [canScrollDown, setCanScrollDown] = React.useState(false);

  React.useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;

    const updateWidth = () => {
      const newWidth = form.clientWidth + 1; // border compensation
      setContainerWidth(prev => (prev === newWidth ? prev : newWidth));
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(form);

    return () => resizeObserver.disconnect();
  }, []);

  const updateScrollIndicators = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 8);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    requestAnimationFrame(updateScrollIndicators);
  }, [open, updateScrollIndicators]);

  const selectedModel = models.find(m => m.id === selectedModelId);
  const displayName = selectedModel?.name || (isLoading ? "Loading..." : "Select Model");
  const selectedProvider = selectedModel?.id.split("/")[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
              {selectedProvider && (
                <ProviderLogo provider={selectedProvider} size="sm" />
              )}
              <div className={`
                max-w-32 overflow-hidden whitespace-nowrap truncate
                transition-all duration-200 text-sm font-medium
                group-hover/model:ml-1
                lg:max-w-none lg:group-hover/model:ml-0 lg:ml-0
              `}>
                {formatModelName(displayName, settings?.hideModelProviderNames ?? false)}
              </div>
              <ChevronDownIcon
                size={14}
                className={cn(`transition-transform shrink-0`, open && !isLoading
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
        className={cn("rounded-none p-0 shadow-none", popoverWidth === "w-full" ? "" : popoverWidth)}
      >
        {isLoading || !models || models.length === 0
          ? (
            <div className="text-muted-foreground py-4 text-center text-sm">
              {isLoading ? "Loading models..." : "No models available"}
            </div>
          )
          : (
            <Command onValueChange={() => requestAnimationFrame(updateScrollIndicators)}>
              <CommandInput placeholder="Search models..." className="h-12" onValueChange={() => requestAnimationFrame(updateScrollIndicators)} />
              <div className="relative">
                {canScrollUp && (
                  <div className="from-popover pointer-events-none absolute top-0 right-0 left-0 z-10 h-12 bg-linear-to-b to-transparent" />
                )}
                <CommandList
                  ref={listRef}
                  onScroll={updateScrollIndicators}
                  className="p-1 "
                >
                  <CommandEmpty>No models found.</CommandEmpty>
                  <CommandGroup>
                    {models.map((model) => {
                      const capabilities = getModelCapabilities(model);
                      return (
                        <CommandItem
                          key={model.id}
                          value={`${model.name} ${model.id}`}
                          onSelect={() => {
                            onSelectModelAction(model.id);
                            setOpen(false);
                          }}
                          className={cn(
                            "h-12 justify-between px-2 py-2",
                            selectedModelId === model.id
                              ? "bg-primary/10 text-primary"
                              : "",
                          )}
                        >
                           <div className="flex-1">
                             <div className="flex items-center gap-1">
                               <ProviderLogo provider={model.id.split("/")[0]} size="sm" />
                               <div className="text-sm font-medium">
                                 {formatModelName(model.name, settings?.hideModelProviderNames ?? false)}
                               </div>
                             </div>
                             <div className="text-xs text-muted-foreground">
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
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
                {canScrollDown && (
                  <div className="from-popover pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-16 bg-linear-to-t to-transparent" />
                )}
              </div>
            </Command>
          )}
      </PopoverContent>
    </Popover>
  );
}
