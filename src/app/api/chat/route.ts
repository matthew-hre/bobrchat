import type { UIMessage } from "ai";

import { streamChatResponse } from "~/server/ai/service";
import { saveMessage } from "~/server/db/queries/chat";

export type MessageMetadata = {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  model: string;
  tokensPerSecond: number;
  timeToFirstTokenMs: number;
};

export type ChatUIMessage = UIMessage<MessageMetadata>;

export async function POST(req: Request) {
  const { messages, threadId }: { messages: ChatUIMessage[]; threadId?: string }
    = await req.json();
  const modelId = "google/gemini-3-flash-preview";

  const { stream, createMetadata } = await streamChatResponse(messages, modelId);

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
