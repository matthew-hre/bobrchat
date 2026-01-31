import { and, eq, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { cache } from "react";

import { db } from "~/lib/db";
import { messages, threads } from "~/lib/db/schema/chat";
import { threadShares } from "~/lib/db/schema/sharing";
import { decryptMessage } from "~/lib/security/encryption";
import { getKeyMeta, getSaltForVersion } from "~/lib/security/keys";

type ChatUIMessage = {
  role: string;
  parts?: Array<{ type?: string; text?: string }>;
  content?: string;
  metadata?: { model?: string };
};

function generateShareId(): string {
  return crypto.randomBytes(9).toString("base64url");
}

function extractTextContent(message: ChatUIMessage): string {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (part?.type === "text" && part.text) return part.text;
    }
  }
  return "";
}

/**
 * Fetch and compute OG preview data for a thread.
 * Decrypts messages to extract first user message and model info.
 */
async function getOgPreviewData(
  threadId: string,
  userId: string,
): Promise<{ ogTitle: string; ogModel: string | null; ogFirstMessage: string | null }> {
  // Get thread title
  const thread = await db
    .select({ title: threads.title, model: threads.model })
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);

  const ogTitle = thread[0]?.title || "Shared Chat";
  let ogModel: string | null = thread[0]?.model || null;
  let ogFirstMessage: string | null = null;

  // Get encryption key metadata
  const keyMeta = await getKeyMeta(userId);
  if (!keyMeta) {
    return { ogTitle, ogModel, ogFirstMessage };
  }

  // Fetch first few messages to find user message and assistant model
  const rows = await db
    .select({
      role: messages.role,
      content: messages.content,
      iv: messages.iv,
      ciphertext: messages.ciphertext,
      authTag: messages.authTag,
      keyVersion: messages.keyVersion,
    })
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(messages.createdAt)
    .limit(5);

  for (const row of rows) {
    let decrypted: ChatUIMessage | null = null;

    if (row.iv && row.ciphertext && row.authTag) {
      try {
        const salt = await getSaltForVersion(userId, row.keyVersion ?? keyMeta.version);
        if (salt) {
          decrypted = decryptMessage(
            { iv: row.iv, ciphertext: row.ciphertext, authTag: row.authTag },
            userId,
            salt,
          ) as ChatUIMessage;
        }
      } catch {
        continue;
      }
    } else {
      decrypted = row.content as ChatUIMessage;
    }

    if (!decrypted) continue;

    // Extract first user message
    if (row.role === "user" && !ogFirstMessage) {
      const text = extractTextContent(decrypted);
      ogFirstMessage = text.length > 200 ? `${text.slice(0, 197)}...` : text;
    }

    // Extract model from first assistant message
    if (row.role === "assistant" && !ogModel) {
      ogModel = decrypted.metadata?.model || ogModel;
    }

    // Stop once we have both
    if (ogFirstMessage && ogModel) break;
  }

  return { ogTitle, ogModel, ogFirstMessage };
}

/**
 * Create or update a share for a thread.
 * If share exists (even if revoked), updates it. Otherwise creates new.
 */
export async function upsertThreadShare(
  threadId: string,
  userId: string,
  showAttachments: boolean,
): Promise<{ shareId: string; isNew: boolean }> {
  // First verify thread ownership
  const thread = await db
    .select({ id: threads.id })
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
    .limit(1);

  if (thread.length === 0) {
    throw new Error("Thread not found or unauthorized");
  }

  // Get OG preview data (decrypts messages to extract preview info)
  const { ogTitle, ogModel, ogFirstMessage } = await getOgPreviewData(threadId, userId);

  // Check for existing share
  const existing = await db
    .select({ id: threadShares.id })
    .from(threadShares)
    .where(eq(threadShares.threadId, threadId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing share (un-revoke if revoked, update settings and OG data)
    await db
      .update(threadShares)
      .set({ showAttachments, revokedAt: null, ogTitle, ogModel, ogFirstMessage })
      .where(eq(threadShares.threadId, threadId));
    return { shareId: existing[0].id, isNew: false };
  }

  // Create new share
  const shareId = generateShareId();
  await db.insert(threadShares).values({
    id: shareId,
    threadId,
    showAttachments,
    ogTitle,
    ogModel,
    ogFirstMessage,
  });
  return { shareId, isNew: true };
}

/**
 * Get share info by share ID (for public page)
 * Returns null if not found or revoked
 */
export const getShareByShareId = cache(async (shareId: string): Promise<{
  threadId: string;
  showAttachments: boolean;
  createdAt: Date;
} | null> => {
  const result = await db
    .select({
      threadId: threadShares.threadId,
      showAttachments: threadShares.showAttachments,
      createdAt: threadShares.createdAt,
      revokedAt: threadShares.revokedAt,
    })
    .from(threadShares)
    .where(eq(threadShares.id, shareId))
    .limit(1);

  if (result.length === 0 || result[0].revokedAt !== null) {
    return null;
  }

  return {
    threadId: result[0].threadId,
    showAttachments: result[0].showAttachments,
    createdAt: result[0].createdAt,
  };
});

/**
 * Get share info by thread ID (for share modal)
 * Returns share even if revoked so UI can show status
 */
export async function getShareByThreadId(
  threadId: string,
  userId: string,
): Promise<{
  shareId: string;
  showAttachments: boolean;
  createdAt: Date;
  isRevoked: boolean;
} | null> {
  // Verify ownership
  const thread = await db
    .select({ id: threads.id })
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
    .limit(1);

  if (thread.length === 0) {
    return null;
  }

  const result = await db
    .select({
      id: threadShares.id,
      showAttachments: threadShares.showAttachments,
      createdAt: threadShares.createdAt,
      revokedAt: threadShares.revokedAt,
    })
    .from(threadShares)
    .where(eq(threadShares.threadId, threadId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    shareId: result[0].id,
    showAttachments: result[0].showAttachments,
    createdAt: result[0].createdAt,
    isRevoked: result[0].revokedAt !== null,
  };
}

/**
 * Revoke a share (soft delete by setting revokedAt)
 */
export async function revokeThreadShare(
  threadId: string,
  userId: string,
): Promise<boolean> {
  // Verify ownership
  const thread = await db
    .select({ id: threads.id })
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
    .limit(1);

  if (thread.length === 0) {
    return false;
  }

  const result = await db
    .update(threadShares)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(threadShares.threadId, threadId), isNull(threadShares.revokedAt)),
    )
    .returning();

  return result.length > 0;
}
