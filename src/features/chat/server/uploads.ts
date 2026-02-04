import type { AppFileUIPart, ChatUIMessage } from "~/features/chat/types";

import { getFileContent } from "~/features/attachments/lib/storage";
import { getAttachmentsByIds, getPdfPageCountsByStoragePaths } from "~/features/attachments/queries";
import { isFilePart, isTextPart } from "~/features/chat/types";

function isTextFile(mediaType: string): boolean {
  return (
    mediaType.startsWith("text/")
    || mediaType === "application/json"
    || mediaType.includes("csv")
  );
}

/**
 * Processes messages to extract text file content and inject it into the prompt.
 *
 * Text files (text/*, application/json, csv) are ALWAYS extracted into the prompt
 * because providers generally don't support text file uploads directly - only PDFs and images.
 * The "supportsFiles" capability from models refers to binary files like PDFs/images, not text files.
 *
 * @param messages The chat messages to process.
 * @param userId The user ID for ownership verification of attachments.
 * @returns Processed messages with extracted text content.
 */
export async function processMessageFiles(
  messages: ChatUIMessage[],
  userId: string,
): Promise<ChatUIMessage[]> {
  const allTextFileParts: Array<{ msgIndex: number; partIndex: number; part: AppFileUIPart }> = [];

  for (let msgIndex = 0; msgIndex < messages.length; msgIndex++) {
    const msg = messages[msgIndex];
    if (!msg.parts)
      continue;

    for (let partIndex = 0; partIndex < msg.parts.length; partIndex++) {
      const part = msg.parts[partIndex];
      if (!isFilePart(part))
        continue;

      const filePart = part as AppFileUIPart;
      if (!isTextFile(filePart.mediaType))
        continue;

      if (!filePart.id) {
        if (filePart.storagePath)
          console.warn(`File part has storagePath but no id, skipping for security: ${filePart.storagePath}`);
        continue;
      }

      allTextFileParts.push({ msgIndex, partIndex, part: filePart });
    }
  }

  if (allTextFileParts.length === 0) {
    return messages;
  }

  const attachmentIds = allTextFileParts.map(({ part }) => part.id!);
  const ownedAttachments = await getAttachmentsByIds(userId, attachmentIds);
  const attachmentMap = new Map(ownedAttachments.map(a => [a.id, a]));

  const fileContents = await Promise.all(
    allTextFileParts.map(async ({ msgIndex, partIndex, part }) => {
      const attachment = attachmentMap.get(part.id!);
      if (!attachment) {
        console.warn(`Attachment ${part.id} not found or not owned by user ${userId}`);
        return { msgIndex, partIndex, content: null };
      }

      try {
        const content = await getFileContent(attachment.storagePath);
        return {
          msgIndex,
          partIndex,
          content: `\n\n[File Content: ${attachment.filename}]\n${content}\n`,
        };
      }
      catch (error) {
        console.error(`Failed to fetch file content for ${attachment.filename}:`, error);
        return {
          msgIndex,
          partIndex,
          content: `\n\n[Failed to read file content: ${attachment.filename}]\n`,
        };
      }
    }),
  );

  const contentsByMessage = new Map<number, Array<{ partIndex: number; content: string | null }>>();
  for (const fc of fileContents) {
    if (!contentsByMessage.has(fc.msgIndex)) {
      contentsByMessage.set(fc.msgIndex, []);
    }
    contentsByMessage.get(fc.msgIndex)!.push({ partIndex: fc.partIndex, content: fc.content });
  }

  return messages.map((msg, msgIndex) => {
    const msgContents = contentsByMessage.get(msgIndex);
    if (!msgContents || !msg.parts) {
      return msg;
    }

    const indicesToRemove = new Set(msgContents.map(c => c.partIndex));
    const newParts = msg.parts.filter((_, index) => !indicesToRemove.has(index));

    const textContent = msgContents
      .filter(c => c.content !== null)
      .sort((a, b) => a.partIndex - b.partIndex)
      .map(c => c.content)
      .join("");

    if (!textContent) {
      return { ...msg, parts: newParts };
    }

    const lastPart = newParts[newParts.length - 1];
    if (lastPart && isTextPart(lastPart)) {
      const updatedLast = { ...lastPart, text: lastPart.text + textContent };
      return { ...msg, parts: [...newParts.slice(0, -1), updatedLast] };
    }

    return { ...msg, parts: [...newParts, { type: "text" as const, text: textContent }] };
  });
}

/**
 * Checks if any message contains a PDF attachment.
 *
 * @param messages The chat messages to check.
 * @returns True if any message has a PDF attachment.
 */
export function hasPdfAttachment(messages: ChatUIMessage[]): boolean {
  return messages.some(msg =>
    msg.parts?.some(part => isFilePart(part) && part.mediaType === "application/pdf"),
  );
}

/**
 * Extracts PDF storage paths from messages.
 */
function extractPdfStoragePaths(messages: ChatUIMessage[]): string[] {
  const paths: string[] = [];
  for (const msg of messages) {
    if (!msg.parts)
      continue;
    for (const part of msg.parts) {
      if (!isFilePart(part))
        continue;
      const filePart = part as AppFileUIPart;
      if (filePart.mediaType === "application/pdf" && filePart.storagePath) {
        paths.push(filePart.storagePath);
      }
    }
  }
  return paths;
}

/**
 * Calculates total PDF page count from messages by querying the database.
 *
 * @param messages The chat messages to check.
 * @returns Total page count across all PDF attachments.
 */
export async function getTotalPdfPageCount(messages: ChatUIMessage[]): Promise<number> {
  const storagePaths = extractPdfStoragePaths(messages);
  if (storagePaths.length === 0)
    return 0;

  const pageCountMap = await getPdfPageCountsByStoragePaths(storagePaths);

  let totalPages = 0;
  for (const path of storagePaths) {
    totalPages += pageCountMap.get(path) ?? 0;
  }
  return totalPages;
}
