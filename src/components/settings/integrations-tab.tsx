"use client";

import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  SaveIcon,
  ServerIcon,
  SmartphoneIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { apiKeyUpdateSchema } from "~/lib/schemas/settings";
import { cn } from "~/lib/utils";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";
import { useUserSettingsContext } from "./user-settings-provider";

type StorageType = "client" | "server";

const storageOptions: { value: StorageType; label: string; description: string; icon: typeof ServerIcon }[] = [
  {
    value: "client",
    label: "Browser Only",
    description: "Stored locally in your browser",
    icon: SmartphoneIcon,
  },
  {
    value: "server",
    label: "Encrypted Server",
    description: "Stored encrypted on the server",
    icon: ServerIcon,
  },
];

export function IntegrationsTab() {
  const { settings, loading, setApiKey, removeApiKey } = useUserSettingsContext();
  const initializedRef = useRef(false);
  const parallelInitializedRef = useRef(false);

  // OpenRouter state
  const [apiKey, setApiKeyValue] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [storageType, setStorageType] = useState<StorageType | null>(
    () => settings?.apiKeyStorage?.openrouter ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Parallel.ai state
  const [parallelApiKey, setParallelApiKeyValue] = useState("");
  const [showParallelApiKey, setShowParallelApiKey] = useState(false);
  const [parallelStorageType, setParallelStorageType] = useState<StorageType | null>(
    () => settings?.apiKeyStorage?.parallel ?? null,
  );
  const [isParallelSaving, setIsParallelSaving] = useState(false);
  const [isParallelDeleting, setIsParallelDeleting] = useState(false);

  const hasExistingKey = settings?.apiKeyStorage?.openrouter !== undefined;
  const hasExistingParallelKey = settings?.apiKeyStorage?.parallel !== undefined;

  // Sync OpenRouter storage type when settings load for the first time
  if (settings?.apiKeyStorage?.openrouter && !initializedRef.current) {
    initializedRef.current = true;
    if (storageType !== settings.apiKeyStorage.openrouter) {
      setStorageType(settings.apiKeyStorage.openrouter);
    }
  }

  // Sync Parallel.ai storage type when settings load for the first time
  if (settings?.apiKeyStorage?.parallel && !parallelInitializedRef.current) {
    parallelInitializedRef.current = true;
    if (parallelStorageType !== settings.apiKeyStorage.parallel) {
      setParallelStorageType(settings.apiKeyStorage.parallel);
    }
  }

  const handleSave = useCallback(async () => {
    if (!apiKey.trim() || !storageType)
      return;

    setIsSaving(true);
    try {
      // Validate inputs with Zod before sending
      const validated = apiKeyUpdateSchema.parse({
        apiKey: apiKey.trim(),
        storeServerSide: storageType === "server",
      });

      // Provider handles both server action and localStorage sync
      await setApiKey("openrouter", validated.apiKey, validated.storeServerSide);

      setApiKeyValue("");
      toast.success(hasExistingKey ? "API key updated" : "API key saved");
    }
    catch (error) {
      console.error("Failed to save API key:", error);
      const message = error instanceof z.ZodError
        ? error.issues.map(e => e.message).join(", ")
        : error instanceof Error
          ? error.message
          : "Failed to save API key";
      toast.error(message);
    }
    finally {
      setIsSaving(false);
    }
  }, [apiKey, storageType, setApiKey, hasExistingKey]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      // Provider handles both server action and localStorage cleanup
      await removeApiKey("openrouter");
      toast.success("API key removed");
    }
    catch {
      toast.error("Failed to remove API key");
    }
    finally {
      setIsDeleting(false);
    }
  }, [removeApiKey]);

  const handleParallelSave = useCallback(async () => {
    if (!parallelApiKey.trim() || !parallelStorageType)
      return;

    setIsParallelSaving(true);
    try {
      // Validate inputs with Zod before sending
      const validated = apiKeyUpdateSchema.parse({
        apiKey: parallelApiKey.trim(),
        storeServerSide: parallelStorageType === "server",
      });

      // Provider handles both server action and localStorage sync
      await setApiKey("parallel", validated.apiKey, validated.storeServerSide);

      setParallelApiKeyValue("");
      toast.success(hasExistingParallelKey ? "API key updated" : "API key saved");
    }
    catch (error) {
      console.error("Failed to save API key:", error);
      const message = error instanceof z.ZodError
        ? error.issues.map(e => e.message).join(", ")
        : error instanceof Error
          ? error.message
          : "Failed to save API key";
      toast.error(message);
    }
    finally {
      setIsParallelSaving(false);
    }
  }, [parallelApiKey, parallelStorageType, setApiKey, hasExistingParallelKey]);

  const handleParallelDelete = useCallback(async () => {
    setIsParallelDeleting(true);
    try {
      // Provider handles both server action and localStorage cleanup
      await removeApiKey("parallel");
      toast.success("API key removed");
    }
    catch {
      toast.error("Failed to remove API key");
    }
    finally {
      setIsParallelDeleting(false);
    }
  }, [removeApiKey]);

  if (loading) {
    return <IntegrationsTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Integrations</h3>
        <p className="text-muted-foreground text-sm">
          Manage your API keys and external service connections.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-8">
          {/* OpenRouter API Key */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <KeyIcon className="size-5" />
              <h4 className="font-medium">OpenRouter API Key</h4>
              {hasExistingKey
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
                  {hasExistingKey ? "Update API Key" : "Enter API Key"}
                </Label>
              </div>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKeyValue(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className={cn(`
                      text-muted-foreground absolute top-1/2 right-3
                      -translate-y-1/2 transition-colors
                      hover:text-foreground
                    `)}
                  >
                    {showApiKey
                      ? <EyeOffIcon className="size-4" />
                      : (
                          <EyeIcon className="size-4" />
                        )}
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
            <div className="space-y-3">
              <Label>
                Storage Method
                {!hasExistingKey && (
                  <span className="text-destructive -ml-1">*</span>
                )}
              </Label>
              {hasExistingKey && storageType
                ? (
                    <div
                      className={cn(`
                        border-primary bg-primary/5 flex flex-col gap-1
                        rounded-lg border p-3
                      `)}
                    >
                      {(() => {
                        const option = storageOptions.find(
                          o => o.value === storageType,
                        );
                        if (!option)
                          return null;
                        const Icon = option.icon;
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <Icon className="size-4" />
                              <span className="text-sm font-medium">
                                {option.label}
                              </span>
                              <CheckIcon
                                className={cn(`
                                  bg-primary text-primary-foreground size-3
                                  rounded-full p-0.5
                                `)}
                              />
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {option.description}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  )
                : (
                    <div className="grid grid-cols-2 gap-2">
                      {storageOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = storageType === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setStorageType(option.value)}
                            className={cn(
                              `
                                flex flex-col items-start gap-1 rounded-lg
                                border p-3 text-left transition-colors
                              `,
                              isSelected
                                ? "border-primary bg-primary/5"
                                : `
                                  border-input cursor-pointer
                                  hover:bg-muted
                                `,
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="size-4" />
                              <span className="text-sm font-medium">
                                {option.label}
                              </span>
                              {isSelected && (
                                <CheckIcon
                                  className={cn(`
                                    bg-primary text-primary-foreground size-3
                                    rounded-full p-0.5
                                  `)}
                                />
                              )}
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {option.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
              <p className="text-muted-foreground text-xs">
                {hasExistingKey
                  ? "Storage method is locked. Delete your key to change it."
                  : storageType === "server"
                    ? "Your key will be encrypted and stored securely on our servers."
                    : storageType === "client"
                      ? "Your key stays in your browser and is never sent to our servers."
                      : "Select a storage method to continue."}
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={handleSave}
                  disabled={!apiKey.trim() || !storageType || isSaving}
                >
                  <SaveIcon className="size-4" />
                  {isSaving ? "Saving..." : hasExistingKey ? "Update Key" : "Save Key"}
                </Button>
                {hasExistingKey && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <TrashIcon className="size-4" />
                    {isDeleting ? "Removing..." : "Remove"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Parallel.ai API Key */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <KeyIcon className="size-5" />
              <h4 className="font-medium">Parallel.ai API Key</h4>
              {hasExistingParallelKey
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
                  {hasExistingParallelKey ? "Update API Key" : "Enter API Key"}
                </Label>
              </div>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="parallelApiKey"
                    type={showParallelApiKey ? "text" : "password"}
                    value={parallelApiKey}
                    onChange={e => setParallelApiKeyValue(e.target.value)}
                    placeholder="pr_..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowParallelApiKey(!showParallelApiKey)}
                    className={cn(`
                      text-muted-foreground absolute top-1/2 right-3
                      -translate-y-1/2 transition-colors
                      hover:text-foreground
                    `)}
                  >
                    {showParallelApiKey
                      ? <EyeOffIcon className="size-4" />
                      : (
                          <EyeIcon className="size-4" />
                        )}
                  </button>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Get your API key from
                {" "}
                <a
                  href="https://parallel.ai/account/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    text-primary
                    hover:underline
                  `}
                >
                  parallel.ai/account/api-keys
                </a>
              </p>
            </div>

            {/* Storage Type Selection */}
            <div className="space-y-3">
              <Label>
                Storage Method
                {!hasExistingParallelKey && (
                  <span className="text-destructive -ml-1">*</span>
                )}
              </Label>
              {hasExistingParallelKey && parallelStorageType
                ? (
                    <div
                      className={cn(`
                        border-primary bg-primary/5 flex flex-col gap-1
                        rounded-lg border p-3
                      `)}
                    >
                      {(() => {
                        const option = storageOptions.find(
                          o => o.value === parallelStorageType,
                        );
                        if (!option)
                          return null;
                        const Icon = option.icon;
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <Icon className="size-4" />
                              <span className="text-sm font-medium">
                                {option.label}
                              </span>
                              <CheckIcon
                                className={cn(`
                                  bg-primary text-primary-foreground size-3
                                  rounded-full p-0.5
                                `)}
                              />
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {option.description}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  )
                : (
                    <div className="grid grid-cols-2 gap-2">
                      {storageOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = parallelStorageType === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setParallelStorageType(option.value)}
                            className={cn(
                              `
                                flex flex-col items-start gap-1 rounded-lg
                                border p-3 text-left transition-colors
                              `,
                              isSelected
                                ? "border-primary bg-primary/5"
                                : `
                                  border-input cursor-pointer
                                  hover:bg-muted
                                `,
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="size-4" />
                              <span className="text-sm font-medium">
                                {option.label}
                              </span>
                              {isSelected && (
                                <CheckIcon
                                  className={cn(`
                                    bg-primary text-primary-foreground size-3
                                    rounded-full p-0.5
                                  `)}
                                />
                              )}
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {option.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
              <p className="text-muted-foreground text-xs">
                {hasExistingParallelKey
                  ? "Storage method is locked. Delete your key to change it."
                  : parallelStorageType === "server"
                    ? "Your key will be encrypted and stored securely on our servers."
                    : parallelStorageType === "client"
                      ? "Your key stays in your browser and is never sent to our servers."
                      : "Select a storage method to continue."}
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={handleParallelSave}
                  disabled={!parallelApiKey.trim() || !parallelStorageType || isParallelSaving}
                >
                  <SaveIcon className="size-4" />
                  {isParallelSaving ? "Saving..." : hasExistingParallelKey ? "Update Key" : "Save Key"}
                </Button>
                {hasExistingParallelKey && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9"
                    onClick={handleParallelDelete}
                    disabled={isParallelDeleting}
                  >
                    <TrashIcon className="size-4" />
                    {isParallelDeleting ? "Removing..." : "Remove"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-6">
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
    </div>
  );
}
