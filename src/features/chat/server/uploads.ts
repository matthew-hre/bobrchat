import type { AppFileUIPart, ChatUIMessage } from "~/features/chat/types";

import { getFileBuffer } from "~/features/attachments/lib/storage";
import { getAttachmentsByIds, getPdfPageCountsByStoragePaths } from "~/features/attachments/queries";
import { isFilePart, isTextPart } from "~/features/chat/types";
import { decryptBuffer, deriveUserKey, isEncryptedBuffer } from "~/lib/security/encryption";
import { getSaltForVersion } from "~/lib/security/keys";

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
  const allBinaryFileParts: Array<{ msgIndex: number; partIndex: number; part: AppFileUIPart }> = [];

  for (let msgIndex = 0; msgIndex < messages.length; msgIndex++) {
    const msg = messages[msgIndex];
    if (!msg.parts)
      continue;

    for (let partIndex = 0; partIndex < msg.parts.length; partIndex++) {
      const part = msg.parts[partIndex];
      if (!isFilePart(part))
        continue;

      const filePart = part as AppFileUIPart;
      if (!filePart.id) {
        if (filePart.storagePath)
          console.warn(`File part has storagePath but no id, skipping for security: ${filePart.storagePath}`);
        continue;
      }

      if (!isTextFile(filePart.mediaType))
        allBinaryFileParts.push({ msgIndex, partIndex, part: filePart });
      else
        allTextFileParts.push({ msgIndex, partIndex, part: filePart });
    }
  }

  if (allTextFileParts.length === 0 && allBinaryFileParts.length === 0) {
    return messages;
  }

  const attachmentIds = [
    ...allTextFileParts.map(({ part }) => part.id!),
    ...allBinaryFileParts.map(({ part }) => part.id!),
  ];
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
        const raw = await getFileBuffer(attachment.storagePath);
        let content: string;
        if (attachment.isEncrypted && isEncryptedBuffer(raw)) {
          const salt = await getSaltForVersion(userId, attachment.keyVersion ?? 1);
          if (!salt) {
            throw new Error(`Missing salt for key version ${attachment.keyVersion}`);
          }
          const key = deriveUserKey(userId, salt);
          content = decryptBuffer(raw, key).toString("utf-8");
        }
        else {
          content = raw.toString("utf-8");
        }
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

  const binaryUpdates = await Promise.all(
    allBinaryFileParts.map(async ({ msgIndex, partIndex, part }) => {
      const attachment = attachmentMap.get(part.id!);
      if (!attachment) {
        console.warn(`Attachment ${part.id} not found or not owned by user ${userId}`);
        return {
          msgIndex,
          partIndex,
          dataUrl: null,
          filename: part.filename ?? "file",
        };
      }

      try {
        const raw = await getFileBuffer(attachment.storagePath);
        let buffer = raw;
        if (attachment.isEncrypted && isEncryptedBuffer(raw)) {
          const salt = await getSaltForVersion(userId, attachment.keyVersion ?? 1);
          if (!salt) {
            throw new Error(`Missing salt for key version ${attachment.keyVersion}`);
          }
          const key = deriveUserKey(userId, salt);
          buffer = decryptBuffer(raw, key);
        }

        const dataUrl = `data:${attachment.mediaType};base64,${buffer.toString("base64")}`;
        return {
          msgIndex,
          partIndex,
          dataUrl,
          filename: attachment.filename,
        };
      }
      catch (error) {
        console.error(`Failed to fetch file content for ${attachment.filename}:`, error);
        return {
          msgIndex,
          partIndex,
          dataUrl: null,
          filename: attachment.filename,
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

  const binaryUpdatesByMessage = new Map<number, Map<number, string>>();
  for (const update of binaryUpdates) {
    if (!update.dataUrl) {
      if (!contentsByMessage.has(update.msgIndex)) {
        contentsByMessage.set(update.msgIndex, []);
      }
      contentsByMessage.get(update.msgIndex)!.push({
        partIndex: update.partIndex,
        content: `\n\n[Failed to load attachment: ${update.filename}]\n`,
      });
      continue;
    }

    if (!binaryUpdatesByMessage.has(update.msgIndex)) {
      binaryUpdatesByMessage.set(update.msgIndex, new Map());
    }
    binaryUpdatesByMessage.get(update.msgIndex)!.set(update.partIndex, update.dataUrl);
  }

  return messages.map((msg, msgIndex) => {
    const msgContents = contentsByMessage.get(msgIndex);
    const msgBinaryUpdates = binaryUpdatesByMessage.get(msgIndex);
    if (!msgContents || !msg.parts) {
      if (!msgBinaryUpdates || !msg.parts) {
        return msg;
      }
    }

    const indicesToRemove = new Set(msgContents?.map(c => c.partIndex) ?? []);
    let updatedParts = msg.parts.map((part, index) => {
      const dataUrl = msgBinaryUpdates?.get(index);
      if (!dataUrl)
        return part;
      return { ...part, url: dataUrl };
    });
    updatedParts = updatedParts.filter((_, index) => !indicesToRemove.has(index));

    const textContent = (msgContents ?? [])
      .filter(c => c.content !== null)
      .sort((a, b) => a.partIndex - b.partIndex)
      .map(c => c.content)
      .join("");

    if (!textContent) {
      return { ...msg, parts: updatedParts };
    }

    const lastPart = updatedParts[updatedParts.length - 1];
    if (lastPart && isTextPart(lastPart)) {
      const updatedLast = { ...lastPart, text: lastPart.text + textContent };
      return { ...msg, parts: [...updatedParts.slice(0, -1), updatedLast] };
    }

    return { ...msg, parts: [...updatedParts, { type: "text" as const, text: textContent }] };
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
