import type { TextStreamPart, ToolSet } from "ai";

import { convertToModelMessages, stepCountIs, streamText } from "ai";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { getTokenCosts } from "./cost";
import { calculateResponseMetadata } from "./metrics";
import { getModelProvider } from "./models";
import { generatePrompt } from "./prompt";
import { createSearchTools } from "./search";
import { createStreamHandlers, processStreamChunk } from "./stream";
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
 * @param userId The ID of the user making the request (to get their API key).
 * @param openRouterApiKey Optional API key provided by the client (for browser-only storage).
 * @param searchEnabled Whether web search is enabled for this request.
 * @param parallelApiKey The Parallel Web API key for web search functionality.
 * @param onFirstToken Optional callback to capture first token timing from the messageMetadata handler.
 * @param modelSupportsFiles Optional boolean indicating if the model natively supports file uploads.
 * @param pdfEngineConfig Configuration for PDF processing engine selection.
 * @returns An object containing the text stream and a function to create metadata for each message part.
 */
export async function streamChatResponse(
  messages: ChatUIMessage[],
  modelId: string,
  userId: string,
  openRouterApiKey: string,
  searchEnabled?: boolean,
  parallelApiKey?: string,
  onFirstToken?: () => void,
  modelSupportsFiles?: boolean,
  pdfEngineConfig?: PdfEngineConfig,
) {
  if (!openRouterApiKey) {
    throw new Error("No API key configured. Please set up your OpenRouter API key in settings.");
  }

  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  const sources: Array<{ id: string; sourceType: string; url?: string; title?: string }> = [];

  const provider = getModelProvider(openRouterApiKey);
  const { inputCostPerMillion, outputCostPerMillion } = await getTokenCosts(modelId);
  const systemPrompt = await generatePrompt(userId);

  // Process messages to handle file extraction if needed
  const processedMessages = await processMessageFiles(messages, modelSupportsFiles);

  const convertedMessages = await convertToModelMessages(processedMessages);

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

  const tools = searchEnabled ? createSearchTools(parallelApiKey) : undefined;

  const hasPdf = hasPdfAttachment(messages);
  const useOcr = hasPdf && pdfEngineConfig?.useOcrForPdfs && !pdfEngineConfig?.supportsNativePdf;
  const ocrPageCount = useOcr ? await getTotalPdfPageCount(messages) : 0;

  const getPdfPluginConfig = () => {
    if (!hasPdf) {
      return undefined;
    }

    if (pdfEngineConfig?.supportsNativePdf) {
      return undefined;
    }

    const engine = pdfEngineConfig?.useOcrForPdfs ? "mistral-ocr" : "pdf-text";
    return {
      plugins: [{
        id: "file-parser" as const,
        pdf: { engine: engine as "pdf-text" | "mistral-ocr" },
      }],
    };
  };

  const result = streamText({
    model: provider(modelId),
    system: systemPrompt,
    messages: convertedMessages,
    tools,
    stopWhen: stepCountIs(8),
    providerOptions: {
      openrouter: {
        usage: { include: true },
        ...getPdfPluginConfig(),
      },
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
          ocrPageCount,
        });
      }
    },
  };
}
