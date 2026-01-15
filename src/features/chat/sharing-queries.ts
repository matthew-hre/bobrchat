import crypto from "crypto";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "~/lib/db";
import { threadShares } from "~/lib/db/schema/sharing";
import { threads } from "~/lib/db/schema/chat";

function generateShareId(): string {
  return crypto.randomBytes(9).toString("base64url");
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

  // Check for existing share
  const existing = await db
    .select({ id: threadShares.id })
    .from(threadShares)
    .where(eq(threadShares.threadId, threadId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing share (un-revoke if revoked, update settings)
    await db
      .update(threadShares)
      .set({ showAttachments, revokedAt: null })
      .where(eq(threadShares.threadId, threadId));
    return { shareId: existing[0].id, isNew: false };
  }

  // Create new share
  const shareId = generateShareId();
  await db.insert(threadShares).values({
    id: shareId,
    threadId,
    showAttachments,
  });
  return { shareId, isNew: true };
}

/**
 * Get share info by share ID (for public page)
 * Returns null if not found or revoked
 */
export async function getShareByShareId(shareId: string): Promise<{
  threadId: string;
  showAttachments: boolean;
  createdAt: Date;
} | null> {
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
}

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
