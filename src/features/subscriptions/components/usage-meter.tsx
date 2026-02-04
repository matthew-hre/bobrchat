"use client";

import { cn } from "~/lib/utils";

type UsageMeterProps = {
  current: number;
  limit: number | null;
  label: string;
  formatValue?: (value: number) => string;
  className?: string;
};

export function UsageMeter({
  current,
  limit,
  label,
  formatValue = v => v.toString(),
  className,
}: UsageMeterProps) {
  if (limit === null) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">
            {formatValue(current)}
            {" "}
            / ∞
          </span>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div className="bg-primary/30 h-full w-full" />
        </div>
      </div>
    );
  }

  const percentage = Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-medium",
          isAtLimit && "text-destructive",
          isNearLimit && !isAtLimit && "text-warning",
        )}
        >
          {formatValue(current)}
          {" "}
          /
          {" "}
          {formatValue(limit)}
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full transition-all",
            isAtLimit
              ? "bg-destructive"
              : isNearLimit
                ? "bg-warning"
                : `bg-primary`,
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
