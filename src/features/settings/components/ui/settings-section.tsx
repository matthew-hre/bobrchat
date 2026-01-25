import { cn } from "~/lib/utils";

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "danger";
};

export function SettingsSection({
  title,
  description,
  children,
  className,
  variant = "default",
}: SettingsSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-1">
        <h4
          className={cn(
            "text-sm font-semibold",
            variant === "danger" ? "text-destructive" : "text-foreground",
          )}
        >
          {title}
        </h4>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
