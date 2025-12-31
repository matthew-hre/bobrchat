import type { UIMessage } from "ai";

import { streamChatResponse } from "~/server/ai/service";

export type MessageMetadata = {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  tokensPerSecond: number;
  timeToFirstTokenMs: number;
};

export type ChatUIMessage = UIMessage<MessageMetadata>;

export async function POST(req: Request) {
  const { messages }: { messages: ChatUIMessage[] } = await req.json();
  const modelId = "google/gemini-3-flash-preview";

  const { stream, createMetadata } = await streamChatResponse(messages, modelId);

  return stream.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: ({ part }) => createMetadata(part),
  });
}
