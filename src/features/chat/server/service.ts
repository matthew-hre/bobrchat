import type { TextStreamPart, ToolSet } from "ai";

import { convertToModelMessages, stepCountIs, streamText } from "ai";

import type { ChatUIMessage } from "~/features/chat/types";
import type { UserSettingsData } from "~/features/settings/types";

import { calculateResponseMetadata } from "./metrics";
import { getModelProvider } from "./models";
import { generatePrompt } from "./prompt";
import { createStreamHandlers, getPdfPluginConfig, getReasoningConfig, processStreamChunk } from "./stream";
import { createHandoffTool, createSearchTools } from "./tools";
import { getTotalPdfPageCount, hasPdfAttachment, processMessageFiles } from "./uploads";

export type PdfEngineConfig = {
  useOcrForPdfs: boolean;
  supportsNativePdf: boolean;
};

/**
 * Streams a chat response from the AI model.
 *
 * @param messages The chat messages to send to the model.
 * @param modelId The ID of the model to use.
 * @param openRouterApiKey The resolved OpenRouter API key.
 * @param userSettings The user's settings (pre-fetched to avoid duplicate DB queries).
 * @param searchEnabled Whether web search is enabled for this request.
 * @param parallelApiKey The Parallel Web API key for web search functionality.
 * @param pdfEngineConfig Configuration for PDF processing engine selection.
 * @param modelPricing Optional pricing data from client cache. If not provided, pricing will default to 0.
 * @returns An object containing the text stream and a function to create metadata for each message part.
 */
export type ReasoningLevel = "xhigh" | "high" | "medium" | "low" | "minimal" | "none";

export async function streamChatResponse(
  messages: ChatUIMessage[],
  modelId: string,
  openRouterApiKey: string,
  userSettings: UserSettingsData,
  userId: string,
  searchEnabled?: boolean,
  parallelApiKey?: string,
  pdfEngineConfig?: PdfEngineConfig,
  reasoningLevel?: string,
  threadId?: string,
  modelPricing?: { prompt: string; completion: string },
  supportsTools?: boolean,
) {
  if (!openRouterApiKey) {
    throw new Error("No API key configured. Please set up your OpenRouter API key in settings.");
  }

  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  const searchCalls: Array<{ resultCount: number }> = [];
  const extractCalls: Array<{ urlCount: number }> = [];

  const provider = getModelProvider(openRouterApiKey);

  const hasPdf = hasPdfAttachment(messages);
  const useOcr = hasPdf && pdfEngineConfig?.useOcrForPdfs && !pdfEngineConfig?.supportsNativePdf;
  const ocrPageCountPromise = useOcr ? getTotalPdfPageCount(messages) : Promise.resolve(0);

  const systemPrompt = generatePrompt(userSettings);

  // Use pricing from client cache or default to 0
  const inputCostPerToken = Number(modelPricing?.prompt ?? 0);
  const outputCostPerToken = Number(modelPricing?.completion ?? 0);

  const processedMessages = await processMessageFiles(messages, userId);

  // Strip reasoning parts from assistant messages to avoid "Thought signature is not valid"
  // errors with Gemini models. Thinking tokens have cryptographic signatures that become
  // invalid after passing through proxies like OpenRouter.
  const messagesWithoutReasoning = processedMessages.map((msg) => {
    if (msg.role !== "assistant" || !msg.parts)
      return msg;
    const filteredParts = msg.parts.filter(part => part.type !== "reasoning");
    return { ...msg, parts: filteredParts };
  });

  const convertedMessages = await convertToModelMessages(messagesWithoutReasoning);

  const streamHandlers = createStreamHandlers(
    () => {
      // First token timing is now captured in createMetadata at text-start
    },
    (call) => {
      searchCalls.push(call);
    },
    (call) => {
      extractCalls.push(call);
    },
  );

  const searchTools = searchEnabled && parallelApiKey ? createSearchTools(parallelApiKey) : {};
  const handoffTools = threadId ? createHandoffTool(userId, threadId, messages, openRouterApiKey) : {};
  const tools = (Object.keys({ ...searchTools, ...handoffTools }).length > 0) && supportsTools
    ? { ...searchTools, ...handoffTools }
    : undefined;

  const result = streamText({
    model: provider(modelId),
    system: systemPrompt,
    messages: convertedMessages,
    tools,
    stopWhen: stepCountIs(8),
    providerOptions: {
      openrouter: {
        usage: { include: true },
        ...getPdfPluginConfig(hasPdf, pdfEngineConfig),
        ...getReasoningConfig(reasoningLevel),
      },
    },
    onChunk({ chunk }) {
      processStreamChunk(chunk, streamHandlers);
    },
  });

  let resolvedOcrPageCount: number | null = null;
  ocrPageCountPromise.then((count) => {
    resolvedOcrPageCount = count;
  });

  return {
    stream: result,
    createMetadata: (part: TextStreamPart<ToolSet>) => {
      // Capture TTFT at first actual output token (reasoning or text-start)
      if (firstTokenTime === null && (part.type === "reasoning-start" || part.type === "text-start")) {
        firstTokenTime = Date.now();
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
          inputCostPerToken,
          outputCostPerToken,
          searchCalls,
          extractCalls,
          ocrPageCount: resolvedOcrPageCount ?? 0,
        });
      }
    },
  };
}
