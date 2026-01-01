import { cn } from "~/lib/utils";

type UserMessageProps = {
  content: string;
  className?: string;
};

export function UserMessage({ content, className }: UserMessageProps) {
  return (
    <div className={cn("flex justify-end", className)}>
      <div
        className={cn(`
          bg-primary text-primary-foreground prose prose-sm max-w-[80%]
          rounded-2xl rounded-br-sm px-4 py-2.5
          md:max-w-[70%]
        `)}
      >
        <p className="wrap-break-word whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
