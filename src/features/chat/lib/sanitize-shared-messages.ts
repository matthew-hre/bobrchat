import type { FileUIPart } from "ai";

import type { ChatUIMessage } from "~/app/api/chat/route";
import type { AppFileUIPart } from "~/features/chat/types";

import { isFilePart } from "~/features/chat/types";

/**
 * Sanitizes a file part by removing internal fields (id, storagePath)
 * while keeping SDK-required fields (url, mediaType).
 */
function sanitizeFilePart(part: AppFileUIPart): FileUIPart {
  return {
    type: "file",
    url: part.url,
    mediaType: part.mediaType,
    ...(part.filename !== undefined && { filename: part.filename }),
  };
}

export function sanitizeMessagesForSharing(
  messages: ChatUIMessage[],
  options: { showAttachments: boolean },
): ChatUIMessage[] {
  if (options.showAttachments) {
    return messages;
  }

  return messages.map((message) => {
    if (!message.parts) {
      return message;
    }

    const sanitizedParts = message.parts.map((part) => {
      if (isFilePart(part)) {
        return sanitizeFilePart(part as AppFileUIPart);
      }
      return part;
    });

    return { ...message, parts: sanitizedParts };
  });
}
