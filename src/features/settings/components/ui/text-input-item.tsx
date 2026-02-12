import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export function TextInputItem({
  label,
  description,
  value,
  placeholder,
  size = "single",
  maxLength,
  onChange,
  onBlur,
}: {
  label: string;
  description: string;
  value: string;
  placeholder?: string;
  size?: "single" | "multi";
  maxLength?: number;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  const isOverLimit = maxLength !== undefined && value.length > maxLength;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {size === "single"
        ? (
            <Input
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
              onBlur={onBlur}
              placeholder={placeholder}
              className={isOverLimit ? "border-destructive focus-visible:ring-destructive" : ""}
            />
          )
        : (
            <Textarea
              value={value}
              onChange={e => onChange(e.target.value)}
              onBlur={onBlur}
              placeholder={placeholder}
              className={cn("h-32", isOverLimit && "border-destructive focus-visible:ring-destructive")}
            />
          )}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{description}</p>
        {maxLength !== undefined && isOverLimit && (
          <p className="text-destructive text-xs">
            {value.length}
            /
            {maxLength}
          </p>
        )}
      </div>
    </div>
  );
}