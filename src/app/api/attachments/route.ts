import { headers } from "next/headers";

import { deleteFile } from "~/features/attachments/lib/storage";
import {
  deleteUserAttachments,
  deleteUserAttachmentsByIds,
  listUserAttachments,
} from "~/features/attachments/queries";
import { auth } from "~/features/auth/lib/auth";

const PAGE_SIZE = 12;

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") ?? "all") as "all" | "image" | "pdf" | "text";
  const order = (searchParams.get("order") ?? "desc") as "asc" | "desc";
  const cursor = searchParams.get("cursor") ?? undefined;

  const { items, nextCursor } = await listUserAttachments({
    userId: session.user.id,
    type,
    order,
    limit: PAGE_SIZE,
    cursor,
  });

  return json({
    items: items.map(i => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })),
    nextCursor,
  });
}

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  }
  catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.some(id => typeof id !== "string")) {
    return json({ error: "Expected { ids: string[] }" }, { status: 400 });
  }

  const toDelete = await deleteUserAttachments({ userId: session.user.id, ids });
  if (toDelete.ids.length === 0)
    return json({ deleted: 0 });

  try {
    await Promise.all(toDelete.storagePaths.map(p => deleteFile(p)));
  }
  catch (error) {
    console.error("Failed to delete attachments from storage", error);
    return json({ error: "Failed to delete from storage" }, { status: 500 });
  }

  const deleted = await deleteUserAttachmentsByIds({ userId: session.user.id, ids: toDelete.ids });
  return json({ deleted });
}
