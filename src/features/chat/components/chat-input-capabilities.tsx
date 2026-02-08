"use client";

import { BrainIcon, MoreVerticalIcon, PaperclipIcon, SearchIcon } from "lucide-react";
import * as React from "react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

function ActiveIndicator() {
  return (
    <div className={`
      pointer-events-none absolute -top-0.5 -right-0.5 flex items-center
      justify-center
    `}
    >
      <span className={`
        bg-primary/50 absolute inline-flex size-2 animate-ping rounded-full
      `}
      />
      <span className="bg-primary relative inline-flex size-2 rounded-full" />
    </div>
  );
}

type ModelCapabilities = {
  supportsReasoning: boolean;
  supportsSearch: boolean;
  supportsImages: boolean;
  supportsFiles: boolean;
  supportsPdf: boolean;
  supportsNativePdf: boolean;
};

type CapabilitiesProps = {
  capabilities: ModelCapabilities;
  reasoningLevel: string;
  searchEnabled: boolean;
  pendingFilesCount: number;
  hasOpenRouterKey: boolean;
  hasParallelApiKey: boolean;
  isParallelApiLoading: boolean;
  onReasoningLevelChange: (level: string) => void;
  onSearchToggle: () => void;
  onAttachClick: () => void;
  acceptedFileTypesDescription: string;
};

export function ChatInputCapabilities({
  capabilities,
  reasoningLevel,
  searchEnabled,
  pendingFilesCount,
  hasOpenRouterKey,
  hasParallelApiKey,
  isParallelApiLoading,
  onReasoningLevelChange,
  onSearchToggle,
  onAttachClick,
  acceptedFileTypesDescription,
}: CapabilitiesProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isAnythingActive = reasoningLevel !== "none" || searchEnabled || pendingFilesCount > 0;

  return (
    <>
      {/* Desktop: All visible inline */}
      <div className={`
        hidden items-center gap-2
        md:flex
      `}
      >
        {capabilities.supportsReasoning && (
          <ReasoningButton
            reasoningLevel={reasoningLevel}
            onLevelChange={onReasoningLevelChange}
          />
        )}

        {capabilities.supportsSearch && (
          <SearchButton
            searchEnabled={searchEnabled}
            hasParallelApiKey={hasParallelApiKey}
            isParallelApiLoading={isParallelApiLoading}
            onToggle={onSearchToggle}
          />
        )}

        {(capabilities.supportsImages || capabilities.supportsFiles || capabilities.supportsPdf) && (
          <AttachButton
            hasOpenRouterKey={hasOpenRouterKey}
            pendingFilesCount={pendingFilesCount}
            onAttachClick={onAttachClick}
            acceptedFileTypesDescription={acceptedFileTypesDescription}
          />
        )}
      </div>

      {/* Mobile: More menu button with indicator */}
      {(capabilities.supportsReasoning || capabilities.supportsSearch || capabilities.supportsImages
        || capabilities.supportsFiles || capabilities.supportsPdf) && (
        <div className="md:hidden">
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className={`
                    hover:text-foreground
                    text-muted-foreground
                  `}
                >
                  <MoreVerticalIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Options</TooltipContent>
            </Tooltip>
            {isAnythingActive && <ActiveIndicator />}
          </div>
        </div>
      )}

      {/* Mobile menu sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="bottom" className="w-full px-6 pb-8">
          <SheetHeader className="pl-0">
            <SheetTitle>Message Options</SheetTitle>
          </SheetHeader>

          <div className="space-y-3">
            {capabilities.supportsReasoning && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Reasoning Level</p>
                <div className="grid grid-cols-3 gap-2">
                  {["xhigh", "high", "medium", "low", "minimal", "none"].map(level => (
                    <Button
                      key={level}
                      type="button"
                      variant={reasoningLevel === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => onReasoningLevelChange(level)}
                      disabled={hasParallelApiKey === false}
                      className="text-xs"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
                {hasParallelApiKey === false && !isParallelApiLoading && (
                  <p className="text-muted-foreground text-xs">
                    Configure your Parallel API key in settings to use reasoning
                  </p>
                )}
              </div>
            )}

            {capabilities.supportsSearch && (
              <Button
                type="button"
                variant={searchEnabled ? "default" : "outline"}
                onClick={onSearchToggle}
                disabled={hasParallelApiKey === false}
                className="w-full justify-start gap-2"
              >
                <SearchIcon size={16} />
                {searchEnabled ? "Search Enabled" : "Search Disabled"}
              </Button>
            )}

            {(capabilities.supportsImages || capabilities.supportsFiles || capabilities.supportsPdf) && (
              <Button
                type="button"
                onClick={onAttachClick}
                disabled={hasOpenRouterKey === false}
                variant={pendingFilesCount > 0 ? "default" : "outline"}
                className="w-full justify-start gap-2"
              >
                <PaperclipIcon size={16} />
                Attach Files
                {pendingFilesCount > 0 && ` (${pendingFilesCount})`}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ReasoningButton({
  reasoningLevel,
  onLevelChange,
}: {
  reasoningLevel: string;
  onLevelChange: (level: string) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                `
                  hover:text-foreground
                  gap-2 transition-colors
                `,
                reasoningLevel !== "none"
                  ? `
                    text-primary
                    hover:text-primary/80 hover:bg-primary/10
                    dark:hover:text-primary/80 dark:hover:bg-primary/10
                  `
                  : `text-muted-foreground`,
              )}
              title={`Reasoning level: ${reasoningLevel}`}
            >
              <BrainIcon size={16} />
              <span className={`
                hidden
                lg:inline
              `}
              >
                Reasoning
                {reasoningLevel !== "none" && ` (${reasoningLevel})`}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {["xhigh", "high", "medium", "low", "minimal", "none"].map(level => (
              <DropdownMenuItem key={level} onClick={() => onLevelChange(level)}>
                {level}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {`Reasoning level: ${reasoningLevel}`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function SearchButton({
  searchEnabled,
  hasParallelApiKey,
  isParallelApiLoading,
  onToggle,
}: {
  searchEnabled: boolean;
  hasParallelApiKey: boolean | null;
  isParallelApiLoading: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggle}
            disabled={hasParallelApiKey === false}
            className={cn(
              `
                hover:text-foreground
                gap-2 transition-colors
              `,
              searchEnabled
                ? `
                  text-primary
                  hover:text-primary/80 hover:bg-primary/10
                  dark:hover:text-primary/80 dark:hover:bg-primary/10
                `
                : `text-muted-foreground`,
            )}
            title={searchEnabled ? "Search enabled" : "Search disabled"}
          >
            <SearchIcon size={16} />
            <span className={`
              hidden
              lg:inline
            `}
            >
              Search
            </span>
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {hasParallelApiKey === false && !isParallelApiLoading
            ? "Configure your Parallel API key in settings to use search"
            : searchEnabled
              ? "Search is enabled for this message"
              : "Search is disabled for this message"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function AttachButton({
  hasOpenRouterKey,
  pendingFilesCount,
  onAttachClick,
  acceptedFileTypesDescription,
}: {
  hasOpenRouterKey: boolean | null;
  pendingFilesCount: number;
  onAttachClick: () => void;
  acceptedFileTypesDescription: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAttachClick}
          disabled={hasOpenRouterKey === false}
          className={cn(
            `
              text-muted-foreground gap-2
              hover:text-foreground
            `,
            pendingFilesCount > 0 && "text-primary",
          )}
        >
          <PaperclipIcon size={16} />
          <span className={`
            hidden
            lg:inline
          `}
          >
            Attach
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {`Accepts: ${acceptedFileTypesDescription}`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
