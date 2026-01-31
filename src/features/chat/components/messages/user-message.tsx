import { MessageAttachments } from "~/features/chat/components/messages/file-preview";
import { cn } from "~/lib/utils";

type Attachment = {
  url: string;
  filename?: string;
  mediaType?: string;
};

type UserMessageProps = {
  content: string;
  attachments?: Attachment[];
  className?: string;
};

export function UserMessage({ content, attachments, className }: UserMessageProps) {
  const hasContent = Boolean(content);
  const hasAttachments = attachments && attachments.length > 0;

  return (
    <div className={cn("group flex w-full flex-col items-end gap-2", className)}>
      {(hasContent || hasAttachments) && (
        <div
          className={cn(`
            bg-primary text-primary-foreground prose prose-sm rounded-2xl
            rounded-br-sm px-4 py-2.5
          `)}
        >
          {hasContent && (
            <p className="wrap-anywhere whitespace-pre-wrap">{content}</p>
          )}
          {hasAttachments && <MessageAttachments attachments={attachments} />}
        </div>
      )}
    </div>
  );
}
