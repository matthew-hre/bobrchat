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

import { cn } from "~/lib/utils";
import { getModelCapabilities } from "~/features/models";

import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

type ModelSelectorProps = {
  models: Model[];
  selectedModelId?: string;
  onSelectModelAction: (modelId: string) => void;
  className?: string;
  isLoading?: boolean;
};

export function ModelSelector({
  models,
  selectedModelId,
  onSelectModelAction,
  className,
  isLoading = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedModel = models.find(m => m.id === selectedModelId);
  const displayName = selectedModel?.name || (isLoading ? "Loading..." : "Select Model");

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading || (models && models.length === 0)}
          className={cn(`
            hover:text-foreground
            gap-2 transition-colors
          `, `text-muted-foreground`, className)}
          title="Select model"
        >
          <div className="text-sm font-medium">
            {displayName}
          </div>
          <ChevronDownIcon
            size={14}
            className={cn(`transition-transform`, isOpen && !isLoading
              ? `rotate-180`
              : "")}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        alignOffset={-9}
        sideOffset={61}
        className="w-lg rounded-none p-2 shadow-none"
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
