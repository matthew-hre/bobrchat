import { BrainIcon, CheckIcon, ImageIcon, SearchIcon } from "lucide-react";

import { cn } from "~/lib/utils";

const mockModels = [
  {
    name: "Claude Opus 4.5",
    id: "anthropic/claude-opus-4.5",
    selected: true,
    capabilities: ["vision", "reasoning", "search"],
  },
  {
    name: "GPT-5.2",
    id: "openai/gpt-5.2",
    selected: false,
    capabilities: ["vision", "search"],
  },
  {
    name: "GLM 4.7 Flash",
    id: "z-ai/glm-4.7-flash",
    selected: false,
    capabilities: ["reasoning", "search"],
  },
];

export function ModelSelectorMockup() {
  return (
    <div className={`
      border-border bg-background w-full max-w-sm border shadow-sm
    `}
    >
      <div className="space-y-1 p-2">
        {mockModels.map(model => (
          <div
            key={model.id}
            className={cn(
              "flex h-12 w-full items-center justify-between px-3 py-2",
              model.selected
                ? "bg-primary/10"
                : "bg-muted/30",
            )}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    model.selected && "text-primary",
                  )}
                >
                  {model.name}
                </span>
                {model.selected && (
                  <CheckIcon className="text-primary size-3.5" />
                )}
              </div>
              <div className="text-muted-foreground text-xs">{model.id}</div>
            </div>
            <div className="flex gap-1.5">
              {model.capabilities.includes("vision") && (
                <ImageIcon
                  size={14}
                  className={cn(
                    model.selected
                      ? "text-primary/70"
                      : "text-muted-foreground",
                  )}
                />
              )}
              {model.capabilities.includes("reasoning") && (
                <BrainIcon
                  size={14}
                  className={cn(
                    model.selected
                      ? "text-primary/70"
                      : "text-muted-foreground",
                  )}
                />
              )}
              {model.capabilities.includes("search") && (
                <SearchIcon
                  size={14}
                  className={cn(
                    model.selected
                      ? "text-primary/70"
                      : "text-muted-foreground",
                  )}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
