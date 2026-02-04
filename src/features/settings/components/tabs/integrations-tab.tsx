"use client";

import {
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  SaveIcon,
  ServerIcon,
  SmartphoneIcon,
  TrashIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { useApiKeyForm } from "~/features/settings/hooks/use-api-key-form";
import { cn } from "~/lib/utils";

import { SelectionCardItem } from "../ui/selection-card-item";

const storageOptions = [
  {
    value: "client" as const,
    label: "Browser Only",
    description: "Stored locally in your browser",
    icon: SmartphoneIcon,
  },
  {
    value: "server" as const,
    label: "Encrypted Server",
    description: "Stored encrypted on the server",
    icon: ServerIcon,
  },
];

export function IntegrationsTab() {
  const openRouter = useApiKeyForm("openrouter");
  const parallel = useApiKeyForm("parallel");

  if (openRouter.isLoading || parallel.isLoading) {
    return <IntegrationsTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-8 p-6">
        {/* OpenRouter API Key */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyIcon className="size-5" />
            <h4 className="font-medium">OpenRouter API Key</h4>
            {openRouter.hasKey
              ? (
                  <Badge
                    variant="outline"
                    className="border-primary bg-primary/10"
                  >
                    <span className="text-xs">
                      Configured
                    </span>
                  </Badge>
                )
              : (
                  <Badge variant="outline">
                    <span className="text-xs">Not Configured</span>
                  </Badge>
                )}
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            OpenRouter provides access to a variety of AI models.
          </p>

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="apiKey">
                {openRouter.hasKey ? "Update API Key" : "Enter API Key"}
              </Label>
            </div>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={openRouter.showApiKey ? "text" : "password"}
                  value={openRouter.apiKey}
                  onChange={e => openRouter.setApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => openRouter.setShowApiKey(!openRouter.showApiKey)}
                  className={cn(`
                    text-muted-foreground absolute top-1/2 right-3
                    -translate-y-1/2 transition-colors
                    hover:text-foreground
                  `)}
                >
                  {openRouter.showApiKey
                    ? <EyeOffIcon className="size-4" />
                    : <EyeIcon className="size-4" />}
                </button>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Get your API key from
              {" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  text-primary
                  hover:underline
                `}
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>

          {/* Storage Type Selection */}
          <SelectionCardItem
            label="Storage Method"
            options={storageOptions}
            value={openRouter.storageType || openRouter.source}
            onChange={openRouter.setStorageType}
            layout="grid"
            columns={2}
            required={!openRouter.hasKey}
            lockedMessage={openRouter.hasKey && openRouter.source ? "Storage method is locked. Delete your key to change it." : undefined}
            helperText={(selected) => {
              if (openRouter.hasKey) {
                return "Storage method is locked. Delete your key to change it.";
              }
              if (selected === "server") {
                return "Your key will be encrypted and stored securely on our servers.";
              }
              if (selected === "client") {
                return "Your key stays in your browser and is never sent to our servers.";
              }
              return "Select a storage method to continue.";
            }}
          />
          <div className="flex space-x-2">
            <Button
              onClick={openRouter.handleSave}
              disabled={!openRouter.apiKey.trim() || (!openRouter.storageType && !openRouter.hasKey) || openRouter.isSaving}
            >
              <SaveIcon className="size-4" />
              {openRouter.isSaving ? "Saving..." : openRouter.hasKey ? "Update Key" : "Save Key"}
            </Button>
            {openRouter.hasKey && (
              <Button
                variant="destructive"
                size="sm"
                className="h-9"
                onClick={openRouter.handleDelete}
                disabled={openRouter.isDeleting}
              >
                <TrashIcon className="size-4" />
                {openRouter.isDeleting ? "Removing..." : "Remove"}
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Parallel.ai API Key */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyIcon className="size-5" />
            <h4 className="font-medium">Parallel.ai API Key</h4>
            {parallel.hasKey
              ? (
                  <Badge
                    variant="outline"
                    className="border-primary bg-primary/10"
                  >
                    <span className="text-xs">
                      Configured
                    </span>
                  </Badge>
                )
              : (
                  <Badge variant="outline">
                    <span className="text-xs">Not Configured</span>
                  </Badge>
                )}
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            Parallel Search lets your AI access and search the live web in real-time to answer your questions more accurately.
          </p>

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="parallelApiKey">
                {parallel.hasKey ? "Update API Key" : "Enter API Key"}
              </Label>
            </div>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="parallelApiKey"
                  type={parallel.showApiKey ? "text" : "password"}
                  value={parallel.apiKey}
                  onChange={e => parallel.setApiKey(e.target.value)}
                  placeholder="pr_..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => parallel.setShowApiKey(!parallel.showApiKey)}
                  className={cn(`
                    text-muted-foreground absolute top-1/2 right-3
                    -translate-y-1/2 transition-colors
                    hover:text-foreground
                  `)}
                >
                  {parallel.showApiKey
                    ? <EyeOffIcon className="size-4" />
                    : <EyeIcon className="size-4" />}
                </button>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Get your API key from
              {" "}
              <a
                href="https://platform.parallel.ai/settings?tab=api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  text-primary
                  hover:underline
                `}
              >
                platform.parallel.ai/settings
              </a>
            </p>
          </div>

          {/* Storage Type Selection */}
          <SelectionCardItem
            label="Storage Method"
            options={storageOptions}
            value={parallel.storageType || parallel.source}
            onChange={parallel.setStorageType}
            layout="grid"
            columns={2}
            required={!parallel.hasKey}
            lockedMessage={parallel.hasKey && parallel.source ? "Storage method is locked. Delete your key to change it." : undefined}
            helperText={(selected) => {
              if (parallel.hasKey) {
                return "Storage method is locked. Delete your key to change it.";
              }
              if (selected === "server") {
                return "Your key will be encrypted and stored securely on our servers.";
              }
              if (selected === "client") {
                return "Your key stays in your browser and is never sent to our servers.";
              }
              return "Select a storage method to continue.";
            }}
          />
          <div className="flex space-x-2">
            <Button
              onClick={parallel.handleSave}
              disabled={!parallel.apiKey.trim() || (!parallel.storageType && !parallel.hasKey) || parallel.isSaving}
            >
              <SaveIcon className="size-4" />
              {parallel.isSaving ? "Saving..." : parallel.hasKey ? "Update Key" : "Save Key"}
            </Button>
            {parallel.hasKey && (
              <Button
                variant="destructive"
                size="sm"
                className="h-9"
                onClick={parallel.handleDelete}
                disabled={parallel.isDeleting}
              >
                <TrashIcon className="size-4" />
                {parallel.isDeleting ? "Removing..." : "Remove"}
              </Button>
            )}
          </div>
        </div>
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
