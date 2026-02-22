"use client";

import { PaletteIcon } from "lucide-react";
import { useId, useRef } from "react";

import { cn } from "~/lib/utils";

type ColorPreset = {
  value: string;
  color: string;
  label: string;
};

type ColorPickerProps = {
  presets: ColorPreset[];
  value: string | number;
  onChange: (value: string | number) => void;
  customHue?: number | null;
  onCustomHueChange?: (hue: number) => void;
  onCustomHueCommit?: (hue: number) => void;
  swatchSize?: "sm" | "md";
};

function hueToOklch(hue: number) {
  return `oklch(0.72 0.19 ${hue})`;
}

const HUE_GRADIENT =
  "linear-gradient(to right, oklch(0.72 0.19 0), oklch(0.72 0.19 60), oklch(0.72 0.19 120), oklch(0.72 0.19 180), oklch(0.72 0.19 240), oklch(0.72 0.19 300), oklch(0.72 0.19 360))";

function ColorPicker({
  presets,
  value,
  onChange,
  customHue,
  onCustomHueChange,
  onCustomHueCommit,
  swatchSize = "md",
}: ColorPickerProps) {
  const sliderId = useId();
  const sliderRef = useRef<HTMLInputElement>(null);
  const isCustom = typeof value === "number";
  const sizeClass = swatchSize === "sm" ? "h-7 w-7" : "h-8 w-8";
  const previewSize = swatchSize === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div role="group" aria-label="Color picker" className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Color presets"
        className="flex flex-wrap items-center gap-2"
      >
        {presets.map(preset => (
          <button
            key={preset.value}
            type="button"
            role="radio"
            aria-checked={value === preset.value}
            aria-label={preset.label}
            onClick={() => onChange(preset.value)}
            className={cn(
              `
                rounded-full border-2 transition-all
                hover:scale-110
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2
                focus-visible:ring-offset-background
              `,
              sizeClass,
              value === preset.value
                ? `
                  border-foreground ring-foreground ring-offset-background
                  ring-2 ring-offset-2
                `
                : "border-transparent",
            )}
            style={{ backgroundColor: preset.color }}
          />
        ))}
        <div className="bg-border mx-1 h-6 w-px" role="separator" />
        <button
          type="button"
          role="radio"
          aria-checked={isCustom}
          aria-label="Custom color"
          onClick={() => onChange(typeof value === "number" ? value : 200)}
          className={cn(
            `
              flex items-center justify-center rounded-full border
              border-dashed transition-all
              hover:scale-110
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
              focus-visible:ring-offset-background
            `,
            sizeClass,
            isCustom
              ? `
                border-foreground ring-foreground ring-offset-background
                ring-2 ring-offset-2
              `
              : "border-muted-foreground",
          )}
        >
          <PaletteIcon className="text-muted-foreground h-4 w-4" />
        </button>
      </div>
      {isCustom && (
        <div className="flex items-center gap-3">
          <div
            className={cn("shrink-0 rounded-full border", previewSize)}
            style={{ backgroundColor: hueToOklch(customHue ?? value) }}
            aria-hidden="true"
          />
          <label htmlFor={sliderId} className="sr-only">
            Custom hue
          </label>
          <input
            ref={sliderRef}
            id={sliderId}
            type="range"
            role="slider"
            min={0}
            max={360}
            value={customHue ?? value}
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={customHue ?? value}
            aria-valuetext={`${customHue ?? value} degrees`}
            aria-label="Custom hue"
            onChange={(e) => {
              const hue = Number(e.target.value);
              onCustomHueChange?.(hue);
            }}
            onPointerUp={() => {
              if (customHue !== null && customHue !== undefined) {
                onCustomHueCommit?.(customHue);
              }
            }}
            onKeyUp={() => {
              if (customHue !== null && customHue !== undefined) {
                onCustomHueCommit?.(customHue);
              }
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-full"
            style={{ background: HUE_GRADIENT }}
          />
          <span className="text-muted-foreground w-8 text-xs" aria-hidden="true">
            {customHue ?? value}°
          </span>
        </div>
      )}
    </div>
  );
}

export { ColorPicker, hueToOklch };
export type { ColorPreset, ColorPickerProps };
