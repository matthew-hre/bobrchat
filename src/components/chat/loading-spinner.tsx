export function LoadingSpinner() {
  return (
    <div className="flex gap-2">
      <div className="text-muted-foreground flex gap-1 pt-2 text-sm">
        <span className={`
          inline-block size-2 animate-pulse rounded-full bg-current
        `}
        />
        <span
          className="inline-block size-2 animate-pulse rounded-full bg-current"
          style={{ animationDelay: "0.2s" }}
        />
        <span
          className="inline-block size-2 animate-pulse rounded-full bg-current"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    </div>
  );
}
