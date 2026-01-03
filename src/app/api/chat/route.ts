import type { UIMessage } from "ai";

import { headers } from "next/headers";

import { auth } from "~/lib/auth";
import { streamChatResponse } from "~/server/ai/service";
import { saveMessage } from "~/server/db/queries/chat";

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

  const { messages, threadId, browserApiKey, searchEnabled }: { messages: ChatUIMessage[]; threadId?: string; browserApiKey?: string; searchEnabled?: boolean }
    = await req.json();
  const baseModelId = "google/gemini-3-flash-preview";
  const modelId = searchEnabled ? `${baseModelId}:online` : baseModelId;

  const { stream, createMetadata } = await streamChatResponse(messages, modelId, session.user.id, browserApiKey, searchEnabled);

  return stream.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: ({ part }) => createMetadata(part),
    onFinish: async ({ responseMessage }) => {
      if (threadId) {
        await saveMessage(threadId, responseMessage);
      }
    },
  });
}
