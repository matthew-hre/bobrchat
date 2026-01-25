"use client";

import { LoaderIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type ActionInputItemProps = {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "text" | "email" | "password";
};

export function ActionInputItem({
  label,
  description,
  value,
  onChange,
  placeholder,
  actionLabel,
  onAction,
  disabled = false,
  loading = false,
  type = "text",
}: ActionInputItemProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <Button
          onClick={onAction}
          disabled={disabled || loading}
          className="shrink-0"
        >
          {loading ? <LoaderIcon className="size-4 animate-spin" /> : actionLabel}
        </Button>
      </div>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
  );
}
