import type { ChatUIMessage } from "~/app/api/chat/route";

import { getFileContent } from "~/features/attachments/lib/storage";
import { getPdfPageCountsByStoragePaths } from "~/features/attachments/queries";

/**
 * Processes messages to extract file content for models that don't natively support files.
 *
 * @param messages The chat messages to process.
 * @param modelSupportsFiles Whether the model natively supports file uploads.
 * @returns Processed messages with extracted text content.
 */
export async function processMessageFiles(
  messages: ChatUIMessage[],
  modelSupportsFiles?: boolean,
): Promise<ChatUIMessage[]> {
  // If model supports files, pass through unchanged
  if (modelSupportsFiles !== false) {
    return messages;
  }

  return Promise.all(messages.map(async (msg) => {
    if (!msg.parts) {
      return msg;
    }

    const newParts = [];
    let textContent = "";

    for (const part of msg.parts) {
      if (part.type === "file") {
        const filePart = part as { mediaType?: string; storagePath?: string };
        const isText = filePart.mediaType?.startsWith("text/")
          || filePart.mediaType === "application/json"
          || filePart.mediaType?.includes("csv");

        if (isText && filePart.storagePath) {
          try {
            const content = await getFileContent(filePart.storagePath);
            textContent += `\n\n[File Content: ${filePart.storagePath}]\n${content}\n`;
          }
          catch (error) {
            console.error(`Failed to fetch file content for ${filePart.storagePath}:`, error);
            textContent += `\n\n[Failed to read file content: ${filePart.storagePath}]\n`;
          }
        }
        else {
          // Keep non-text files as is
          newParts.push(part);
        }
      }
      else if (part.type === "text") {
        newParts.push(part);
      }
      else {
        newParts.push(part);
      }
    }

    // Append extracted text to the last text part, or create a new one
    if (textContent) {
      const lastPart = newParts[newParts.length - 1];
      if (lastPart && lastPart.type === "text") {
        (lastPart as { text: string }).text += textContent;
      }
      else {
        newParts.push({ type: "text" as const, text: textContent });
      }
    }

    return { ...msg, parts: newParts };
  }));
}

/**
 * Checks if any message contains a PDF attachment.
 *
 * @param messages The chat messages to check.
 * @returns True if any message has a PDF attachment.
 */
export function hasPdfAttachment(messages: ChatUIMessage[]): boolean {
  return messages.some(msg =>
    msg.parts?.some(part =>
      part.type === "file" && (part as { mediaType?: string }).mediaType === "application/pdf",
    ),
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
      if (part.type === "file") {
        const filePart = part as { mediaType?: string; storagePath?: string };
        if (filePart.mediaType === "application/pdf" && filePart.storagePath) {
          paths.push(filePart.storagePath);
        }
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
