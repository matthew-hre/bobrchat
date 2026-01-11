import type { TextStreamPart, ToolSet } from "ai";

// @ts-expect-error - patching @parallel-web/ai-sdk-tools
import { createParallelClient, extractTool, searchTool } from "@parallel-web/ai-sdk-tools";
import { convertToModelMessages, stepCountIs, streamText } from "ai";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { getFileContent } from "~/features/attachments/lib/storage";

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
 * @param openRouterApiKey Optional API key provided by the client (for browser-only storage).
 * @param searchEnabled Whether web search is enabled for this request.
 * @param parallelApiKey The Parallel Web API key for web search functionality.
 * @param onFirstToken Optional callback to capture first token timing from the messageMetadata handler.
 * @param modelSupportsFiles Optional boolean indicating if the model natively supports file uploads.
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
  const processedMessages = await Promise.all(messages.map(async (msg) => {
    // If model supports files, pass through unchanged
    if (modelSupportsFiles !== false)
      return msg;

    // Filter parts: if text file and model doesn't support files, extract content
    if (!msg.parts)
      return msg;

    const newParts = [];
    let textContent = "";

    for (const part of msg.parts) {
      if (part.type === "file") {
        const filePart = part as { mediaType?: string; storagePath?: string };
        const isText = filePart.mediaType?.startsWith("text/")
          || filePart.mediaType === "application/json"
          || filePart.mediaType?.includes("csv"); // loose check

        if (isText && filePart.storagePath) {
          try {
            const content = await getFileContent(filePart.storagePath);
            textContent += `\n\n[File Content: ${filePart.storagePath}]\n${content}\n`;
          }
          catch (error) {
            console.error(`Failed to fetch file content for ${filePart.storagePath}:`, error);
            // If failed, maybe keep the original part or just ignore?
            // Keeping original might fail the model call if it strictly rejects files.
            // Let's add a placeholder error note.
            textContent += `\n\n[Failed to read file content: ${filePart.storagePath}]\n`;
          }
        }
        else {
          // Keep non-text files (images, pdfs) as is, or filter them if model strictly rejects?
          // The client validation should prevent images/PDFs if completely unsupported.
          // But if we are here, it means modelSupportsFiles is false.
          // Yet images might be supported (supportsImages is separate).
          // We only extract TEXT files here.
          newParts.push(part);
        }
      }
      else if (part.type === "text") {
        newParts.push(part);
      }
      else {
        newParts.push(part);
      }
    }

    // Append extracted text to the last text part, or create a new one
    if (textContent) {
      const lastPart = newParts[newParts.length - 1];
      if (lastPart && lastPart.type === "text") {
        (lastPart as { text: string }).text += textContent;
      }
      else {
        newParts.push({ type: "text" as const, text: textContent });
      }
    }

    return { ...msg, parts: newParts };
  }));

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

  let tools: ToolSet | undefined;
  if (searchEnabled && parallelApiKey) {
    const parallelClient = createParallelClient(parallelApiKey);
    // Create custom tools with the user's Pabrallel client
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

  const hasPdfAttachment = messages.some(msg =>
    msg.parts?.some(part =>
      part.type === "file" && (part as { mediaType?: string }).mediaType === "application/pdf",
    ),
  );

  const result = streamText({
    model: provider(modelId),
    system: systemPrompt,
    messages: convertedMessages,
    tools,
    stopWhen: stepCountIs(8),
    providerOptions: {
      openrouter: {
        usage: { include: true },
        ...(hasPdfAttachment && {
          plugins: [{
            id: "file-parser" as const,
            pdf: {
              engine: "pdf-text" as const,
            },
          }],
        }),
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
        });
      }
    },
  };
}
