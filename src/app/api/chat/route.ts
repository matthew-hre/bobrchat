import type { UIMessage } from "ai";

import { headers } from "next/headers";

import { auth } from "~/features/auth/lib/auth";
import { getUserSettings } from "~/features/settings/queries";
import { resolveKey } from "~/lib/api-keys/server";
import { generateThreadTitle } from "~/server/ai/naming";
import { streamChatResponse } from "~/server/ai/service";
import { isThreadOwnedByUser, renameThreadById, saveMessage } from "~/server/db/queries/chat";

export type SourceInfo = {
  id: string;
  sourceType: string;
  url?: string;
  title?: string;
};

export type MessageMetadata = {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  model: string;
  tokensPerSecond: number;
  timeToFirstTokenMs: number;
  sources?: SourceInfo[];
};

export type ChatUIMessage = UIMessage<MessageMetadata> & {
  stoppedByUser?: boolean;
  stoppedModelId?: string | null;
};

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, threadId, openrouterClientKey, parallelClientKey, searchEnabled, modelId, modelSupportsFiles }: { messages: ChatUIMessage[]; threadId?: string; openrouterClientKey?: string; parallelClientKey?: string; searchEnabled?: boolean; modelId?: string; modelSupportsFiles?: boolean }
    = await req.json();

  if (threadId) {
    const isOwned = await isThreadOwnedByUser(threadId, session.user.id);
    if (!isOwned) {
      return new Response(JSON.stringify({ error: "Thread not found or unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      await saveMessage(threadId, session.user.id, lastMessage);
    }
  }

  // Resolve API keys: client-provided keys take precedence over server-stored keys.
  // Fetch both keys in parallel when search is enabled.
  const [openrouterKey, parallelKey] = await Promise.all([
    resolveKey(session.user.id, "openrouter", openrouterClientKey),
    searchEnabled ? resolveKey(session.user.id, "parallel", parallelClientKey) : Promise.resolve(undefined),
  ]);

  if (!openrouterKey) {
    return new Response(JSON.stringify({ error: "No API key configured. Provide a browser key or store one on the server." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (searchEnabled && !parallelKey) {
    return new Response(JSON.stringify({ error: "Web search is enabled but no Parallel API key configured. Provide a browser key or store one on the server." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseModelId = modelId || "google/gemini-3-flash-preview";

  const { stream, createMetadata } = await streamChatResponse(
    messages,
    baseModelId,
    session.user.id,
    openrouterKey,
    searchEnabled,
    parallelKey,
    undefined,
    modelSupportsFiles,
  );

  // Fire and forget: Auto-rename thread if enabled and this is the first message
  if (threadId && messages.length === 1 && messages[0].role === "user") {
    const firstMessage = messages[0];
    const userMessage = firstMessage.parts
      ? firstMessage.parts
          .filter(p => p.type === "text")
          .map(p => (p as { text: string }).text)
          .join("")
      : "";

    // We don't await this promise so it runs in background without blocking response
    (async () => {
      try {
        const settings = await getUserSettings(session.user.id);
        if (settings.autoThreadNaming) {
          const title = await generateThreadTitle(userMessage, openrouterKey);
          await renameThreadById(threadId, session.user.id, title);
        }
      }
      catch (error) {
        console.error("Auto-renaming failed:", error);
      }
    })();
  }

  const response = stream.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: ({ part }) => {
      const metadata = createMetadata(part);
      return metadata;
    },
    onFinish: async ({ responseMessage }) => {
      if (threadId) {
        await saveMessage(threadId, session.user.id, responseMessage);
      }
    },
    sendSources: true,
  });

  return response;
}
