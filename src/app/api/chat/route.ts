import type { UIMessage } from "ai";

import { headers } from "next/headers";

import { auth } from "~/lib/auth";
import { streamChatResponse } from "~/server/ai/service";
import { saveMessage } from "~/server/db/queries/chat";
import { getServerApiKey } from "~/server/db/queries/settings";
import { validateThreadOwnership } from "~/server/db/utils/thread-validation";

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

export type ChatUIMessage = UIMessage<MessageMetadata>;

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

  const { messages, threadId, browserApiKey, parallelBrowserApiKey, searchEnabled, modelId }: { messages: ChatUIMessage[]; threadId?: string; browserApiKey?: string; parallelBrowserApiKey?: string; searchEnabled?: boolean; modelId?: string }
    = await req.json();

  if (threadId) {
    try {
      await validateThreadOwnership(threadId, session);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message === "Thread not found" ? 404 : 403;
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      await saveMessage(threadId, lastMessage);
    }
  }

  const serverApiKey = await getServerApiKey(session.user.id, "openrouter");
  const resolvedApiKey = browserApiKey ?? serverApiKey;

  if (!resolvedApiKey) {
    return new Response(JSON.stringify({ error: "No API key configured. Provide a browser key or store one on the server." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get Parallel.ai API key if search is enabled
  let parallelApiKey: string | undefined;
  if (searchEnabled) {
    const serverParallelApiKey = await getServerApiKey(session.user.id, "parallel");
    parallelApiKey = parallelBrowserApiKey ?? serverParallelApiKey;
  }

  if (searchEnabled && !parallelApiKey) {
    return new Response(JSON.stringify({ error: "Web search is enabled but no Parallel API key configured. Provide a browser key or store one on the server." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseModelId = modelId || "google/gemini-3-flash-preview";

  const { stream, createMetadata } = await streamChatResponse(messages, baseModelId, session.user.id, resolvedApiKey, searchEnabled, parallelApiKey, undefined);

  const response = stream.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: ({ part }) => {
      const metadata = createMetadata(part);
      return metadata;
    },
    onFinish: async ({ responseMessage }) => {
      if (threadId) {
        await saveMessage(threadId, responseMessage);
      }
    },
    sendSources: true,
  });

  return response;
}
