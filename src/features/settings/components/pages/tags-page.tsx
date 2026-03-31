"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangleIcon, CheckIcon, PaletteIcon, PencilIcon, PlusIcon, TagsIcon, Trash2Icon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { ColorPreset } from "~/components/ui/color-picker";
import type { PreferencesUpdate, ToolModelId, UserSettingsData } from "~/features/settings/types";

import { Button } from "~/components/ui/button";
import { ColorPicker, hueToOklch } from "~/components/ui/color-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from "~/features/chat/hooks/use-tags";
import { TOOL_MODEL_OPTIONS } from "~/features/chat/server/providers/types";
import { useChatUIStore } from "~/features/chat/store";
import { getToolModelPricing } from "~/features/settings/actions";
import { useUpdatePreferences } from "~/features/settings/hooks/use-user-settings";
import { cn } from "~/lib/utils";

import { SettingsSection } from "../ui/settings-section";
import { ToggleItem } from "../ui/toggle-item";

const TAG_COLOR_PRESETS: ColorPreset[] = [
  { value: "#ef4444", color: "#ef4444", label: "Red" },
  { value: "#f97316", color: "#f97316", label: "Orange" },
  { value: "#eab308", color: "#eab308", label: "Yellow" },
  { value: "#22c55e", color: "#22c55e", label: "Green" },
  { value: "#06b6d4", color: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", color: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", color: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", color: "#ec4899", label: "Pink" },
];

function TagRow({ tag, autoTagging }: { tag: { id: string; name: string; color: string; description: string | null }; autoTagging: boolean }) {
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();

  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [editDescription, setEditDescription] = useState(tag.description ?? "");
  const [editColor, setEditColor] = useState<string | number>(tag.color);
  const [customHue, setCustomHue] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedEditColor = typeof editColor === "number"
    ? hueToOklch(customHue ?? editColor)
    : editColor;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const name = editName.trim();
    if (!name) {
      setEditName(tag.name);
      setIsEditing(false);
      return;
    }

    const description = editDescription.trim() || null;
    const hasChanges = name !== tag.name || resolvedEditColor !== tag.color || description !== (tag.description ?? null);
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    try {
      await updateTagMutation.mutateAsync({
        tagId: tag.id,
        input: { name, color: resolvedEditColor, description },
      });
      toast.success("Tag updated");
      setIsEditing(false);
    }
    catch {
      toast.error("Failed to update tag");
    }
  };

  const handleCancel = () => {
    setEditName(tag.name);
    setEditDescription(tag.description ?? "");
    setEditColor(tag.color);
    setCustomHue(null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    try {
      await deleteTagMutation.mutateAsync(tag.id);
      toast.success("Tag deleted");
    }
    catch {
      toast.error("Failed to delete tag");
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-1.5 rounded-md border p-1.5">
        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                handleSave();
              else if (e.key === "Escape")
                handleCancel();
            }}
            className="h-7 flex-1 text-xs"
            maxLength={32}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-7 shrink-0"
                style={{ borderColor: resolvedEditColor, color: resolvedEditColor }}
              >
                <PaletteIcon className="size-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <ColorPicker
                presets={TAG_COLOR_PRESETS}
                value={editColor}
                onChange={(val) => {
                  setEditColor(val);
                  if (typeof val !== "number") {
                    setCustomHue(null);
                  }
                }}
                customHue={customHue}
                onCustomHueChange={(hue) => {
                  setCustomHue(hue);
                  setEditColor(hue);
                }}
                onCustomHueCommit={(hue) => {
                  setCustomHue(hue);
                  setEditColor(hue);
                }}
                swatchSize="sm"
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            onClick={handleSave}
            disabled={updateTagMutation.isPending}
          >
            <CheckIcon className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            onClick={handleCancel}
          >
            <XIcon className="size-3" />
          </Button>
        </div>
        <Textarea
          value={editDescription}
          onChange={e => setEditDescription(e.target.value)}
          placeholder="Describe when this tag should be applied..."
          className="min-h-16 resize-none text-xs"
          maxLength={200}
        />
      </div>
    );
  }

  return (
    <div className="group/tag flex items-center gap-2 rounded-md py-1">
      <span
        className="mt-1.5 size-3 shrink-0 self-start rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm">{tag.name}</span>
        {tag.description && (
          <p className="text-muted-foreground truncate text-xs">{tag.description}</p>
        )}
      </div>
      {autoTagging && !tag.description && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangleIcon className={`
              text-muted-foreground/60 size-3.5 shrink-0
            `}
            />
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Add a description so auto-tagging can apply this tag.</p>
          </TooltipContent>
        </Tooltip>
      )}
      <div className={`
        flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity
        group-hover/tag:opacity-100
      `}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6"
          title="Edit tag"
          onClick={() => {
            setEditName(tag.name);
            setEditDescription(tag.description ?? "");
            setEditColor(tag.color);
            setCustomHue(null);
            setConfirmingDelete(false);
            setIsEditing(true);
          }}
        >
          <PencilIcon className="size-3" />
        </Button>
        {confirmingDelete
          ? (
              <Button
                variant="destructive"
                size="sm"
                className="animate-in fade-in zoom-in-95 h-6 px-2 text-xs"
                onClick={handleDelete}
                onBlur={() => setConfirmingDelete(false)}
                disabled={deleteTagMutation.isPending}
                autoFocus
              >
                <Trash2Icon className="size-3" />
                Confirm
              </Button>
            )
          : (
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                title="Delete tag"
                onClick={handleDelete}
                disabled={deleteTagMutation.isPending}
              >
                <Trash2Icon className="size-3" />
              </Button>
            )}
      </div>
    </div>
  );
}

function formatPrice(costPerToken: number | null | undefined): string | null {
  if (costPerToken == null)
    return null;
  const perMillion = costPerToken * 1_000_000;
  if (perMillion < 0.01)
    return "< $0.01/M";
  return `$${perMillion.toFixed(2)}/M`;
}

function AutoTaggingSection({ settings }: { settings: UserSettingsData }) {
  const updatePreferences = useUpdatePreferences();
  const clientKeys = useChatUIStore(s => s.clientKeys);

  const { data: pricing = {} } = useQuery({
    queryKey: ["toolModelPricing"],
    queryFn: () => getToolModelPricing(),
    staleTime: 60 * 60 * 1000,
  });

  const availableProviders = useMemo(() => {
    const providers = new Set<string>();

    if (settings.configuredApiKeys?.openrouter || clientKeys.openrouter) {
      providers.add("openrouter");
    }
    if (settings.configuredApiKeys?.openai || clientKeys.openai) {
      providers.add("openai");
    }
    if (settings.configuredApiKeys?.anthropic || clientKeys.anthropic) {
      providers.add("anthropic");
    }

    if (providers.size === 0) {
      providers.add("openrouter");
      providers.add("openai");
      providers.add("anthropic");
    }

    return providers;
  }, [settings.configuredApiKeys, clientKeys]);

  const filteredOptions = useMemo(
    () => TOOL_MODEL_OPTIONS.filter(o => o.providers.some(p => availableProviders.has(p))),
    [availableProviders],
  );

  const optionMap = Object.fromEntries(TOOL_MODEL_OPTIONS.map(o => [o.id, o]));

  const effectiveValue = filteredOptions.some(o => o.id === settings.toolTagModel)
    ? settings.toolTagModel
    : filteredOptions[0]?.id ?? settings.toolTagModel;

  const save = async (patch: PreferencesUpdate) => {
    try {
      await updatePreferences.mutateAsync(patch);
    }
    catch (error) {
      console.error("Failed to save preferences:", error);
      const message = error instanceof Error ? error.message : "Failed to save preferences";
      toast.error(message);
    }
  };

  return (
    <SettingsSection
      title="Auto-Tagging"
      description="Automatically apply tags to new threads based on their content."
    >
      <ToggleItem
        label="Enable Auto-Tagging"
        description="Automatically tag threads when a message is sent. Only tags with a description are considered."
        enabled={settings.autoTagging}
        onToggle={enabled => save({ autoTagging: enabled })}
      />

      {settings.autoTagging && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Auto-Tagging Model</Label>
            <p className="text-muted-foreground text-xs">Model used for automatic tag selection.</p>
          </div>
          <Select
            value={effectiveValue}
            onValueChange={v => save({ toolTagModel: v as ToolModelId })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filteredOptions.map((option) => {
                const price = formatPrice(pricing[option.id]);
                return (
                  <SelectItem key={option.id} value={option.id}>
                    <span className={`
                      flex w-full items-center justify-between gap-4
                    `}
                    >
                      <span>{optionMap[option.id]?.label ?? option.id}</span>
                      {price && (
                        <span className="text-muted-foreground text-xs">{price}</span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}
    </SettingsSection>
  );
}

export function TagsPage({ settings }: { settings?: UserSettingsData }) {
  const { data: tags } = useTags();
  const createTagMutation = useCreateTag();

  const [newTagName, setNewTagName] = useState("");
  const [newTagDescription, setNewTagDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | number>(TAG_COLOR_PRESETS[5].value);
  const [customHue, setCustomHue] = useState<number | null>(null);

  const resolvedColor = typeof selectedColor === "number"
    ? hueToOklch(customHue ?? selectedColor)
    : selectedColor;

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name)
      return;

    try {
      const description = newTagDescription.trim() || undefined;
      await createTagMutation.mutateAsync({ name, color: resolvedColor, description });
      setNewTagName("");
      setNewTagDescription("");
      setSelectedColor(TAG_COLOR_PRESETS[5].value);
      setCustomHue(null);
      toast.success("Tag created");
    }
    catch {
      toast.error("Failed to create tag");
    }
  };

  const autoTagging = settings?.autoTagging ?? false;

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <SettingsSection
          title="Tags"
          description="Create, rename, or delete tags to organize your threads."
        >
          <div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={`
                      ring-offset-background size-5 shrink-0 cursor-pointer
                      rounded-full border-2
                      focus-visible:ring-ring focus-visible:ring-2
                      focus-visible:ring-offset-2 focus-visible:outline-none
                    `}
                    style={{
                      backgroundColor: resolvedColor,
                      borderColor: resolvedColor,
                    }}
                    title="Pick color"
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <ColorPicker
                    presets={TAG_COLOR_PRESETS}
                    value={selectedColor}
                    onChange={(val) => {
                      setSelectedColor(val);
                      if (typeof val !== "number") {
                        setCustomHue(null);
                      }
                    }}
                    customHue={customHue}
                    onCustomHueChange={(hue) => {
                      setCustomHue(hue);
                      setSelectedColor(hue);
                    }}
                    onCustomHueCommit={(hue) => {
                      setCustomHue(hue);
                      setSelectedColor(hue);
                    }}
                    swatchSize="sm"
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="text"
                placeholder="New tag name..."
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleCreateTag();
                }}
                className="h-8"
                maxLength={32}
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTagMutation.isPending}
              >
                <PlusIcon className="size-3.5" />
                Add
              </Button>
            </div>
            <div className={cn(
              `
                grid transition-[grid-template-rows,opacity] duration-200
                ease-out
              `,
              newTagName.trim()
                ? "grid-rows-[1fr] pt-2 opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
            >
              <div className="overflow-hidden">
                <Textarea
                  value={newTagDescription}
                  onChange={e => setNewTagDescription(e.target.value)}
                  placeholder="Optional: describe when this tag should be applied (used for auto-tagging)..."
                  className="min-h-16 resize-none text-xs"
                  maxLength={200}
                  tabIndex={newTagName.trim() ? 0 : -1}
                />
              </div>
            </div>
          </div>
          {tags && tags.length > 0
            ? (
                <>
                  <Separator />
                  <div className="space-y-0.5">
                    {tags.map(tag => (
                      <TagRow key={tag.id} tag={tag} autoTagging={autoTagging} />
                    ))}
                  </div>
                </>
              )
            : (
                <div className="flex flex-col items-center gap-2 py-6">
                  <TagsIcon className="text-muted-foreground/50 size-8" />
                  <p className="text-muted-foreground text-sm">No tags yet</p>
                  <p className="text-muted-foreground/70 text-xs">
                    Create your first tag above to start organizing threads.
                  </p>
                </div>
              )}
        </SettingsSection>

        {settings && <AutoTaggingSection settings={settings} />}
      </div>
    </div>
  );
}
