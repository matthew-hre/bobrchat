import { MessageAttachments } from "~/components/chat/file-preview";
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
    <div className={cn("flex flex-col items-end gap-2", className)}>
      {content && (
        <div
          className={cn(`
            bg-primary text-primary-foreground prose prose-sm max-w-[80%]
            rounded-2xl rounded-br-sm px-4 py-2.5
            md:max-w-[70%]
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
