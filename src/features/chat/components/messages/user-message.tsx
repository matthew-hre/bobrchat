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
  return (
    <div className={cn("group flex w-full flex-col items-end gap-2", className)}>
      {content && (
        <div
          className={cn(`
            bg-primary text-primary-foreground prose prose-sm rounded-2xl
            rounded-br-sm px-4 py-2.5
          `)}
        >
          <p className="wrap-break-word whitespace-pre-wrap">{content}</p>
          {attachments && attachments.length > 0 && (
            <MessageAttachments attachments={attachments} />
          )}
        </div>
      )}
    </div>
  );
}
