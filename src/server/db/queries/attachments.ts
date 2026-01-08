import { and, asc, desc, eq, gt, inArray, like, lt, or } from "drizzle-orm";
import { Buffer } from "node:buffer";

import { db } from "~/lib/db";
import { attachments, messages } from "~/lib/db/schema/chat";
import { serverEnv } from "~/lib/env";

export type AttachmentTypeFilter = "all" | "image" | "pdf" | "text";
export type AttachmentOrder = "asc" | "desc";

export type AttachmentListItem = {
  id: string;
  filename: string;
  mediaType: string;
  size: number;
  storagePath: string;
  url: string;
  createdAt: Date;
  isLinked: boolean;
};

type Cursor = {
  createdAt: string;
  id: string;
};

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
      url: `${serverEnv.R2_PUBLIC_URL}/${r.storagePath}`,
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
    .returning({ id: attachments.id });

  return result.length;
}
