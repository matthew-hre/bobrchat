import type { ModelMessage, TextStreamPart, ToolSet } from "ai";

import { convertToModelMessages, stepCountIs, streamText } from "ai";

import type { ChatUIMessage } from "~/features/chat/types";
import type { UserSettingsData } from "~/features/settings/types";

import type { ResolvedProvider } from "./providers";

import { calculateResponseMetadata } from "./metrics";
import { generatePrompt } from "./prompt";
import {
  buildAnthropicProviderOptions,
  buildOpenAIProviderOptions,
  buildOpenRouterProviderOptions,
  createAnthropicProvider,
  createOpenAIProvider,
  createOpenRouterProvider,
} from "./providers";
import { createStreamHandlers, processStreamChunk } from "./stream";
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
 * @param resolvedProvider The resolved provider to use (from resolveProvider()).
 * @param userSettings The user's settings (pre-fetched to avoid duplicate DB queries).
 * @param searchEnabled Whether web search is enabled for this request.
 * @param parallelApiKey The Parallel Web API key for web search functionality.
 * @param pdfEngineConfig Configuration for PDF processing engine selection.
 * @param modelPricing Optional pricing data from client cache. If not provided, pricing will default to 0.
 * @returns An object containing the text stream and a function to create metadata for each message part.
 */
export type ReasoningLevel = "xhigh" | "high" | "medium" | "low" | "minimal" | "none";

function stripOpenRouterReasoningDetails(providerOptions: unknown): unknown {
  if (!providerOptions || typeof providerOptions !== "object") {
    return providerOptions;
  }

  const metadata = providerOptions as Record<string, unknown>;
  const openrouter = metadata.openrouter;

  if (!openrouter || typeof openrouter !== "object") {
    return providerOptions;
  }

  const openrouterMetadata = openrouter as Record<string, unknown>;
  if (!("reasoning_details" in openrouterMetadata)) {
    return providerOptions;
  }

  const { reasoning_details: _reasoningDetails, ...restOpenRouter } = openrouterMetadata;
  return {
    ...metadata,
    openrouter: restOpenRouter,
  };
}

export async function streamChatResponse(
  messages: ChatUIMessage[],
  modelId: string,
  resolvedProvider: ResolvedProvider,
  userSettings: UserSettingsData,
  userId: string,
  searchEnabled?: boolean,
  parallelApiKey?: string,
  pdfEngineConfig?: PdfEngineConfig,
  reasoningLevel?: string,
  threadId?: string,
  modelPricing?: { prompt: string; completion: string },
  supportsTools?: boolean,
  handoffEnabled?: boolean,
  utilityProvider?: ResolvedProvider,
) {
  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  const searchCalls: Array<{ resultCount: number }> = [];
  const extractCalls: Array<{ urlCount: number }> = [];

  const provider = resolvedProvider.providerType === "openai"
    ? createOpenAIProvider(resolvedProvider.apiKey)
    : resolvedProvider.providerType === "anthropic"
      ? createAnthropicProvider(resolvedProvider.apiKey)
      : createOpenRouterProvider(resolvedProvider.apiKey);

  const hasPdf = hasPdfAttachment(messages);

  // Direct providers (OpenAI, Anthropic) handle PDFs natively — they don't
  // need OpenRouter's file-parser plugin or OCR pipeline.
  const isDirectProvider = resolvedProvider.providerType === "openai" || resolvedProvider.providerType === "anthropic";
  const effectivePdfConfig: PdfEngineConfig | undefined = isDirectProvider
    ? { useOcrForPdfs: false, supportsNativePdf: true }
    : pdfEngineConfig;

  const useOcr = hasPdf && effectivePdfConfig?.useOcrForPdfs && !effectivePdfConfig?.supportsNativePdf;
  const ocrPageCountPromise = useOcr ? getTotalPdfPageCount(messages) : Promise.resolve(0);

  const systemPrompt = generatePrompt(userSettings);

  // Use pricing from client cache or default to 0
  const inputCostPerToken = Number(modelPricing?.prompt ?? 0);
  const outputCostPerToken = Number(modelPricing?.completion ?? 0);

  const processedMessages = await processMessageFiles(messages, userId);

  // Strip reasoning data from assistant messages to avoid "Invalid signature in thinking block"
  // errors. Thinking tokens have cryptographic signatures that become invalid when replayed
  // in subsequent requests through proxies like OpenRouter.
  // OpenAI's Responses API requires reasoning items to be sent back with conversation history,
  // so we only strip them for non-OpenAI providers.
  const messagesWithoutReasoning = resolvedProvider.providerType === "openai"
    ? processedMessages
    : processedMessages.map((msg) => {
        if (msg.role !== "assistant" || !msg.parts)
          return msg;
        const filteredParts = msg.parts.filter(part => part.type !== "reasoning");
        // Strip reasoning_details from tool part callProviderMetadata to prevent
        // stale thinking signatures from leaking through tool-call providerOptions
        for (const part of filteredParts) {
          if ("callProviderMetadata" in part && part.callProviderMetadata) {
            const meta = part.callProviderMetadata as Record<string, unknown>;
            const openrouter = meta.openrouter;
            if (openrouter && typeof openrouter === "object" && "reasoning_details" in (openrouter as Record<string, unknown>)) {
              const { reasoning_details: _, ...rest } = openrouter as Record<string, unknown>;
              (part as { callProviderMetadata: Record<string, unknown> }).callProviderMetadata = { ...meta, openrouter: rest };
            }
          }
        }
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
  const handoffTools = threadId && handoffEnabled && utilityProvider ? createHandoffTool(userId, threadId, messages, utilityProvider) : {};
  const tools = (Object.keys({ ...searchTools, ...handoffTools }).length > 0) && supportsTools
    ? { ...searchTools, ...handoffTools }
    : undefined;

  const providerOptions = resolvedProvider.providerType === "openai"
    ? buildOpenAIProviderOptions({ reasoningLevel })
    : resolvedProvider.providerType === "anthropic"
      ? buildAnthropicProviderOptions({ reasoningLevel })
      : buildOpenRouterProviderOptions({ hasPdf, pdfEngineConfig: effectivePdfConfig, reasoningLevel });

  // Strip reasoning content from model messages to prevent stale thinking block signatures
  // from being replayed. Used both for initial message history and between multi-step executions.
  const stripReasoningFromModelMessages = resolvedProvider.providerType === "openai"
    ? undefined
    : (msgs: ModelMessage[]): ModelMessage[] => msgs.map((msg) => {
        const currentMessageProviderOptions = (msg as { providerOptions?: unknown }).providerOptions;
        const sanitizedMessageProviderOptions = stripOpenRouterReasoningDetails(currentMessageProviderOptions);

        if (typeof msg.content === "string") {
          if (sanitizedMessageProviderOptions === currentMessageProviderOptions) {
            return msg;
          }

          return {
            ...msg,
            providerOptions: sanitizedMessageProviderOptions,
          } as typeof msg;
        }

        const sanitizedContent = msg.content
          .filter(part => msg.role !== "assistant" || part.type !== "reasoning")
          .map((part) => {
            if (!("providerOptions" in part) || !part.providerOptions) {
              return part;
            }

            const sanitizedPartProviderOptions = stripOpenRouterReasoningDetails(part.providerOptions);
            if (sanitizedPartProviderOptions === part.providerOptions) {
              return part;
            }

            return {
              ...part,
              providerOptions: sanitizedPartProviderOptions,
            } as typeof part;
          });

        if (sanitizedMessageProviderOptions === currentMessageProviderOptions && sanitizedContent === msg.content) {
          return msg;
        }

        return {
          ...msg,
          providerOptions: sanitizedMessageProviderOptions,
          content: sanitizedContent,
        } as typeof msg;
      });

  const sanitizedConvertedMessages = stripReasoningFromModelMessages
    ? stripReasoningFromModelMessages(convertedMessages)
    : convertedMessages;

  const result = streamText({
    model: provider(resolvedProvider.providerModelId),
    system: systemPrompt,
    messages: sanitizedConvertedMessages,
    tools,
    stopWhen: stepCountIs(8),
    providerOptions,
    prepareStep: stripReasoningFromModelMessages
      ? ({ messages: stepMessages }) => {
          return { messages: stripReasoningFromModelMessages(stepMessages) };
        }
      : undefined,
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
