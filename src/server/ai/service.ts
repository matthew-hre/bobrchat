import type { TextStreamPart, ToolSet } from "ai";

import { convertToModelMessages, streamText } from "ai";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { getTokenCosts } from "./cost";
import { calculateResponseMetadata } from "./metrics";
import { getModelProvider } from "./models";
import { generatePrompt } from "./prompt";
import { createStreamHandlers, processStreamChunk } from "./stream";

/**
 * Streams a chat response from the AI model.
 *
 * @param messages The chat messages to send to the model.
 * @param modelId The ID of the model to use.
 * @param userId The ID of the user making the request (to get their API key).
 * @param apiKey Optional API key provided by the client (for browser-only storage).
 * @param searchEnabled Whether web search is enabled for this request.
 * @param onFirstToken Optional callback to capture first token timing from the messageMetadata handler.
 * @returns An object containing the text stream and a function to create metadata for each message part.
 */
export async function streamChatResponse(
  messages: ChatUIMessage[],
  modelId: string,
  userId: string,
  apiKey: string,
  searchEnabled?: boolean,
  onFirstToken?: () => void,
) {
  if (!apiKey) {
    throw new Error("No API key configured. Please set up your OpenRouter API key in settings.");
  }

  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  const sources: Array<{ id: string; sourceType: string; url?: string; title?: string }> = [];

  const provider = getModelProvider(apiKey);
  const { inputCostPerMillion, outputCostPerMillion } = await getTokenCosts(modelId);
  const systemPrompt = await generatePrompt(userId);
  const convertedMessages = await convertToModelMessages(messages);

  const streamHandlers = createStreamHandlers(
    () => {
      if (firstTokenTime === null) {
        firstTokenTime = Date.now();
      }
    },
    (source) => {
      sources.push(source);
    },
  );

  const result = streamText({
    model: provider(modelId),
    system: systemPrompt,
    messages: convertedMessages,
    providerOptions: {
      openrouter: { usage: { include: true } },
    },
    onChunk({ chunk }) {
      processStreamChunk(chunk, streamHandlers);
    },
  });

  return {
    stream: result,
    createMetadata: (part: TextStreamPart<ToolSet>) => {
      // Capture first token when text-start is received (not via onChunk callback)
      if (part.type === "text-start" && firstTokenTime === null) {
        firstTokenTime = Date.now();
        onFirstToken?.();
      }

      if (part.type === "finish") {
        const usage = part.totalUsage;
        const totalTime = Date.now() - startTime;

        return calculateResponseMetadata({
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          totalTime,
          firstTokenTime,
          startTime,
          modelId,
          inputCostPerMillion,
          outputCostPerMillion,
          searchEnabled,
          sources,
        });
      }
    },
  };
}
