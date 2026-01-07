import type { TextStreamPart, ToolSet } from "ai";

// @ts-expect-error - patching @parallel-web/ai-sdk-tools
import { createParallelClient, extractTool, searchTool } from "@parallel-web/ai-sdk-tools";
import { convertToModelMessages, stepCountIs, streamText } from "ai";

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
 * @param parallelApiKey The Parallel Web API key for web search functionality.
 * @param onFirstToken Optional callback to capture first token timing from the messageMetadata handler.
 * @returns An object containing the text stream and a function to create metadata for each message part.
 */
export async function streamChatResponse(
  messages: ChatUIMessage[],
  modelId: string,
  userId: string,
  apiKey: string,
  searchEnabled?: boolean,
  parallelApiKey?: string,
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

  let tools: ToolSet | undefined;
  if (searchEnabled && parallelApiKey) {
    const parallelClient = createParallelClient(parallelApiKey);
    // Create custom tools with the user's Parallel client
    tools = {
      search: {
        ...searchTool,
        execute: async (args, context) => {
          try {
            const result = await parallelClient.beta.search(
              args,
              {
                signal: context.abortSignal,
                headers: { "parallel-beta": "search-extract-2025-10-10" },
              },
            );
            return result;
          }
          catch (error) {
            console.error("[websearch] search tool error:", error);
            throw error;
          }
        },
      },
      extract: {
        ...extractTool,
        execute: async (args, context) => {
          try {
            const result = await parallelClient.beta.extract(
              args,
              {
                signal: context.abortSignal,
                headers: { "parallel-beta": "search-extract-2025-10-10" },
              },
            );
            return result;
          }
          catch (error) {
            console.error("[websearch] extract tool error:", error);
            throw error;
          }
        },
      },
    };
  }

  const result = streamText({
    model: provider(modelId),
    system: systemPrompt,
    messages: convertedMessages,
    tools,
    stopWhen: stepCountIs(8),
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
        // Extract search results from tool calls if available
        const finishPart = part as any;
        if (finishPart.toolCalls && Array.isArray(finishPart.toolCalls)) {
          finishPart.toolCalls.forEach((call: any) => {
            if (call.toolName === "search" && call.result) {
              const results = Array.isArray(call.result) ? call.result : call.result.results;
              if (Array.isArray(results)) {
                results.forEach((item: any) => {
                  if (item.url) {
                    sources.push({
                      id: item.url,
                      sourceType: "url",
                      url: item.url,
                      title: item.title,
                    });
                  }
                });
              }
            }
          });
        }

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
