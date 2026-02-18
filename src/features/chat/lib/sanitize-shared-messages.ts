import type { FileUIPart } from "ai";

import type { AppFileUIPart, ChatUIMessage } from "~/features/chat/types";

import { isFilePart } from "~/features/chat/types";

/**
 * Sanitizes a file part by removing internal fields (id, storagePath)
 * and rewriting the URL to use the share attachment API route.
 */
function sanitizeFilePart(part: AppFileUIPart, shareId?: string): FileUIPart {
  let url = part.url;
  if (shareId && part.id) {
    url = `/api/share/${shareId}/attachment?id=${part.id}`;
  }

  return {
    type: "file",
    url,
    mediaType: part.mediaType,
    ...(part.filename !== undefined && { filename: part.filename }),
  };
}

export function sanitizeMessagesForSharing(
  messages: ChatUIMessage[],
  options: { showAttachments: boolean; shareId?: string },
): ChatUIMessage[] {
  return messages.map((message) => {
    if (!message.parts) {
      return message;
    }

    const sanitizedParts = message.parts.map((part) => {
      if (isFilePart(part)) {
        return sanitizeFilePart(part as AppFileUIPart, options.showAttachments ? options.shareId : undefined);
      }
      return part;
    });

    return { ...message, parts: sanitizedParts };
  });
}
