import type { TextStreamPart, ToolSet } from "ai";

import * as Sentry from "@sentry/nextjs";
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
export type ReasoningLevel = "xhigh" | "high" | "medium" | "low" | "minimal" | "none";

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
  reasoningLevel?: string,
) {
  return Sentry.startSpan(
    { op: "ai.inference", name: `streamChatResponse ${modelId}` },
    async (span) => {
      if (!openRouterApiKey) {
        throw new Error("No API key configured. Please set up your OpenRouter API key in settings.");
      }

      span.setAttribute("ai.model", modelId);
      span.setAttribute("ai.searchEnabled", searchEnabled ?? false);
      span.setAttribute("ai.messageCount", messages.length);

      const startTime = Date.now();
      let firstTokenTime: number | null = null;
      const sources: Array<{ id: string; sourceType: string; url?: string; title?: string }> = [];

      const provider = getModelProvider(openRouterApiKey);

      const hasPdf = hasPdfAttachment(messages);
      const useOcr = hasPdf && pdfEngineConfig?.useOcrForPdfs && !pdfEngineConfig?.supportsNativePdf;
      const ocrPageCountPromise = useOcr ? getTotalPdfPageCount(messages) : Promise.resolve(0);

      const [{ inputCostPerMillion, outputCostPerMillion }, systemPrompt, processedMessages] = await Promise.all([
        getTokenCosts(modelId),
        generatePrompt(userId),
        processMessageFiles(messages, modelSupportsFiles),
      ]);
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

      const getReasoningConfig = () => {
        if (!reasoningLevel || reasoningLevel === "none") {
          return undefined;
        }
        return {
          reasoning: {
            effort: reasoningLevel as ReasoningLevel,
          },
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
            ...getReasoningConfig(),
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
          if (part.type === "text-start" && firstTokenTime === null) {
            firstTokenTime = Date.now();
            onFirstToken?.();
          }

          if (part.type === "finish") {
            const usage = part.totalUsage;
            const totalTime = Date.now() - startTime;

            span.setAttribute("ai.inputTokens", usage.inputTokens ?? 0);
            span.setAttribute("ai.outputTokens", usage.outputTokens ?? 0);
            span.setAttribute("ai.totalTimeMs", totalTime);
            if (firstTokenTime) {
              span.setAttribute("ai.timeToFirstTokenMs", firstTokenTime - startTime);
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
              ocrPageCount: resolvedOcrPageCount ?? 0,
            });
          }
        },
      };
    },
  );
}
