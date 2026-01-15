import type { ChatUIMessage } from "~/app/api/chat/route";

type FilePart = {
  type: "file";
  id?: string;
  url?: string;
  storagePath?: string;
  filename?: string;
  mediaType?: string;
  size?: number;
};

type SanitizedFilePart = {
  type: "file";
  filename?: string;
  mediaType?: string;
  size?: number;
};

function isFilePart(part: unknown): part is FilePart {
  return (
    typeof part === "object" &&
    part !== null &&
    (part as { type?: unknown }).type === "file"
  );
}

function sanitizeFilePart(part: FilePart): SanitizedFilePart {
  const sanitized: SanitizedFilePart = {
    type: "file",
  };

  if (part.filename !== undefined) {
    sanitized.filename = part.filename;
  }
  if (part.mediaType !== undefined) {
    sanitized.mediaType = part.mediaType;
  }
  if (part.size !== undefined) {
    sanitized.size = part.size;
  }

  return sanitized;
}

export function sanitizeMessagesForSharing(
  messages: ChatUIMessage[],
  options: { showAttachments: boolean },
): ChatUIMessage[] {
  if (options.showAttachments) {
    return messages;
  }

  return messages.map((message) => {
    const parts = (message as unknown as { parts?: unknown[] }).parts;
    if (!Array.isArray(parts)) {
      return message;
    }

    const sanitizedParts = parts.map((part) => {
      if (isFilePart(part)) {
        return sanitizeFilePart(part);
      }
      return part;
    });

    return {
      ...message,
      parts: sanitizedParts,
    } as ChatUIMessage;
  });
}
