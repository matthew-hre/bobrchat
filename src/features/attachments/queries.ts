import { and, asc, desc, eq, gt, inArray, like, lt, or, sql, sum } from "drizzle-orm";
import { Buffer } from "node:buffer";

import { db } from "~/lib/db";
import { attachments, messageMetadata, messages } from "~/lib/db/schema/chat";

import type { AttachmentListItem, AttachmentOrder, AttachmentTypeFilter, Cursor } from "./types";

export const STORAGE_QUOTA_BYTES = 104_857_600; // 100MB

export async function getUserStorageUsage(userId: string): Promise<number> {
  const result = await db
    .select({ total: sum(attachments.size) })
    .from(attachments)
    .where(eq(attachments.userId, userId));

  return Number(result[0]?.total ?? 0);
}

export async function getThreadStats(params: {
  userId: string;
  threadId: string;
}): Promise<{ messageCount: number; attachmentCount: number; attachmentSize: number; totalCost: number }> {
  type StatsRow = {
    message_count: number;
    total_cost: number;
    attachment_count: number;
    attachment_size: string;
  };

  const result = await db.execute<StatsRow>(sql`
    select
      (select count(*)::int from ${messages} where ${messages.threadId} = ${params.threadId}) as message_count,
      (
        select coalesce(sum(${messageMetadata.costTotalUsd}::numeric), 0)::float
        from ${messageMetadata}
        inner join ${messages} on ${messageMetadata.messageId} = ${messages.id}
        where ${messages.threadId} = ${params.threadId}
      ) as total_cost,
      (
        select count(*)::int
        from ${attachments}
        inner join ${messages} on ${attachments.messageId} = ${messages.id}
        where ${messages.threadId} = ${params.threadId}
      ) as attachment_count,
      (
        select coalesce(sum(${attachments.size}), 0)::bigint
        from ${attachments}
        inner join ${messages} on ${attachments.messageId} = ${messages.id}
        where ${messages.threadId} = ${params.threadId}
      ) as attachment_size
  `);

  // Handle different return types from postgres-js (array) vs neon-serverless (QueryResult)
  const rows = "rows" in result ? result.rows : (result as unknown as StatsRow[]);
  const row = rows[0];
  return {
    messageCount: row?.message_count ?? 0,
    attachmentCount: row?.attachment_count ?? 0,
    attachmentSize: Number(row?.attachment_size ?? 0),
    totalCost: row?.total_cost ?? 0,
  };
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
}

function buildTypeWhere(type: AttachmentTypeFilter) {
  switch (type) {
    case "image":
      return like(attachments.mediaType, "image/%");
    case "pdf":
      return eq(attachments.mediaType, "application/pdf");
    case "text":
      return like(attachments.mediaType, "text/%");
    case "all":
    default:
      return undefined;
  }
}

export async function listUserAttachments(params: {
  userId: string;
  type: AttachmentTypeFilter;
  order: AttachmentOrder;
  limit: number;
  cursor?: string;
}): Promise<{ items: AttachmentListItem[]; nextCursor?: string }> {
  const whereParts: Array<ReturnType<typeof eq> | undefined> = [eq(attachments.userId, params.userId)];

  const typeWhere = buildTypeWhere(params.type);
  if (typeWhere)
    whereParts.push(typeWhere);

  if (params.cursor) {
    const decoded = decodeCursor(params.cursor);
    const cursorCreatedAt = new Date(decoded.createdAt);
    const cursorId = decoded.id;

    if (params.order === "desc") {
      const cursorWhere = or(
        lt(attachments.createdAt, cursorCreatedAt),
        and(eq(attachments.createdAt, cursorCreatedAt), lt(attachments.id, cursorId)),
      );
      if (cursorWhere)
        whereParts.push(cursorWhere);
    }
    else {
      const cursorWhere = or(
        gt(attachments.createdAt, cursorCreatedAt),
        and(eq(attachments.createdAt, cursorCreatedAt), gt(attachments.id, cursorId)),
      );
      if (cursorWhere)
        whereParts.push(cursorWhere);
    }
  }

  const where = and(...whereParts);

  const rows = await db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      mediaType: attachments.mediaType,
      size: attachments.size,
      storagePath: attachments.storagePath,
      createdAt: attachments.createdAt,
      messageId: attachments.messageId,
    })
    .from(attachments)
    .where(where!)
    .orderBy(
      params.order === "desc" ? desc(attachments.createdAt) : asc(attachments.createdAt),
      params.order === "desc" ? desc(attachments.id) : asc(attachments.id),
    )
    .limit(params.limit);

  const items: AttachmentListItem[] = rows.map((r) => {
    const { messageId, ...rest } = r;
    return {
      ...rest,
      isLinked: messageId !== null,
      url: `/api/attachments/file?id=${r.id}`,
    };
  });

  const last = rows.at(-1);
  const nextCursor = last && rows.length === params.limit
    ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
    : undefined;

  return { items, nextCursor };
}

export async function deleteUserAttachments(params: {
  userId: string;
  ids: string[];
}): Promise<{ ids: string[]; storagePaths: string[] }> {
  if (params.ids.length === 0)
    return { ids: [], storagePaths: [] };

  const rows = await db
    .select({ id: attachments.id, storagePath: attachments.storagePath })
    .from(attachments)
    .where(and(eq(attachments.userId, params.userId), inArray(attachments.id, params.ids)));

  return {
    ids: rows.map(r => r.id),
    storagePaths: rows.map(r => r.storagePath),
  };
}

export async function resolveUserAttachmentsByStoragePaths(params: {
  userId: string;
  storagePaths: string[];
}): Promise<{ ids: string[]; storagePaths: string[] }> {
  const uniqueStoragePaths = Array.from(new Set(params.storagePaths)).filter(p => typeof p === "string" && p.length > 0);
  if (uniqueStoragePaths.length === 0)
    return { ids: [], storagePaths: [] };

  const rows = await db
    .select({ id: attachments.id, storagePath: attachments.storagePath })
    .from(attachments)
    .where(and(eq(attachments.userId, params.userId), inArray(attachments.storagePath, uniqueStoragePaths)));

  return {
    ids: rows.map(r => r.id),
    storagePaths: rows.map(r => r.storagePath),
  };
}

export async function listThreadAttachments(params: {
  userId: string;
  threadId: string;
}): Promise<{ ids: string[]; storagePaths: string[] }> {
  const rows = await db
    .select({ id: attachments.id, storagePath: attachments.storagePath })
    .from(attachments)
    .innerJoin(messages, eq(attachments.messageId, messages.id))
    .where(and(eq(attachments.userId, params.userId), eq(messages.threadId, params.threadId)));

  return {
    ids: rows.map(r => r.id),
    storagePaths: rows.map(r => r.storagePath),
  };
}

export async function deleteUserAttachmentsByIds(params: {
  userId: string;
  ids: string[];
}): Promise<number> {
  if (params.ids.length === 0)
    return 0;

  const result = await db
    .delete(attachments)
    .where(and(eq(attachments.userId, params.userId), inArray(attachments.id, params.ids)))
    .returning();

  return result.length;
}

export async function getPdfPageCountsByStoragePaths(storagePaths: string[]): Promise<Map<string, number>> {
  const uniquePaths = Array.from(new Set(storagePaths)).filter(p => typeof p === "string" && p.length > 0);
  if (uniquePaths.length === 0)
    return new Map();

  const rows = await db
    .select({ storagePath: attachments.storagePath, pageCount: attachments.pageCount })
    .from(attachments)
    .where(
      and(
        inArray(attachments.storagePath, uniquePaths),
        eq(attachments.mediaType, "application/pdf"),
      ),
    );

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.pageCount !== null) {
      map.set(row.storagePath, row.pageCount);
    }
  }
  return map;
}

export type AttachmentRecord = {
  id: string;
  storagePath: string;
  mediaType: string;
  filename: string;
  keyVersion: number | null;
  isEncrypted: boolean;
};

export async function getAttachmentsByIds(
  userId: string,
  ids: string[],
): Promise<AttachmentRecord[]> {
  const uniqueIds = Array.from(new Set(ids)).filter(id => typeof id === "string" && id.length > 0);
  if (uniqueIds.length === 0)
    return [];

  const rows = await db
    .select({
      id: attachments.id,
      storagePath: attachments.storagePath,
      mediaType: attachments.mediaType,
      filename: attachments.filename,
      keyVersion: attachments.keyVersion,
      isEncrypted: attachments.isEncrypted,
    })
    .from(attachments)
    .where(and(eq(attachments.userId, userId), inArray(attachments.id, uniqueIds)));

  return rows;
}
