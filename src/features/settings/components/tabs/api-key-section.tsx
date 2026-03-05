"use client";

import {
  EyeIcon,
  EyeOffIcon,
  SaveIcon,
  ServerIcon,
  SmartphoneIcon,
  TrashIcon,
} from "lucide-react";
import Image from "next/image";

import type { ApiKeyProvider } from "~/lib/api-keys/types";

import { AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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

export type ApiKeyConfig = {
  provider: ApiKeyProvider;
  label: string;
  description: string;
  placeholder: string;
  logo: string;
  link: { href: string; label: string };
};

export function ApiKeySection({ config }: { config: ApiKeyConfig }) {
  const form = useApiKeyForm(config.provider);

  return (
    <AccordionItem value={config.provider}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <Image
              src={config.logo}
              alt={`${config.label} logo`}
              width={24}
              height={24}
              className={cn(`
                size-5 invert-0
                dark:invert
              `)}
            />
            <span className="font-medium">{config.label}</span>
            {form.hasKey && (
              <Badge
                variant="outline"
                className="border-primary bg-primary/10"
              >
                <span className="text-xs">Configured</span>
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {config.description}
          </p>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4">

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${config.provider}-apiKey`}>
              {form.hasKey ? "Update API Key" : "Enter API Key"}
            </Label>
          </div>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Input
                id={`${config.provider}-apiKey`}
                type={form.showApiKey ? "text" : "password"}
                value={form.apiKey}
                onChange={e => form.setApiKey(e.target.value)}
                placeholder={config.placeholder}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => form.setShowApiKey(!form.showApiKey)}
                className={cn(`
                  text-muted-foreground absolute top-1/2 right-3
                  -translate-y-1/2 transition-colors
                  hover:text-foreground
                `)}
              >
                {form.showApiKey
                  ? <EyeOffIcon className="size-4" />
                  : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Get your API key from
            {" "}
            <a
              href={config.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                text-primary
                hover:underline
              `}
            >
              {config.link.label}
            </a>
          </p>
        </div>

        <SelectionCardItem
          label="Storage Method"
          options={storageOptions}
          value={form.storageType || form.source}
          onChange={form.setStorageType}
          layout="grid"
          columns={2}
          required={!form.hasKey}
          lockedMessage={form.hasKey && form.source ? "Storage method is locked. Delete your key to change it." : undefined}
          helperText={(selected) => {
            if (form.hasKey) {
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
            onClick={form.handleSave}
            disabled={!form.apiKey.trim() || (!form.storageType && !form.hasKey) || form.isSaving}
          >
            <SaveIcon className="size-4" />
            {form.isSaving ? "Saving..." : form.hasKey ? "Update Key" : "Save Key"}
          </Button>
          {form.hasKey && (
            <Button
              variant="destructive"
              size="sm"
              className="h-9"
              onClick={form.handleDelete}
              disabled={form.isDeleting}
            >
              <TrashIcon className="size-4" />
              {form.isDeleting ? "Removing..." : "Remove"}
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
