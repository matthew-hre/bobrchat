import type { ChatUIMessage } from "~/features/chat/types";

import { ensureThreadExists, renameThreadById, saveMessage, updateThreadIcon } from "~/features/chat/queries";
import { formatProviderError } from "~/features/chat/server/error";
import { streamChatResponse } from "~/features/chat/server/service";
import { generateThreadIcon, generateThreadTitle } from "~/features/chat/server/thread";
import { getUserSettingsAndKeys } from "~/features/settings/queries";

type ChatRequestBody = {
  messages: ChatUIMessage[];
  threadId?: string;
  openrouterClientKey?: string;
  parallelClientKey?: string;
  searchEnabled?: boolean;
  reasoningLevel?: string;
  modelId?: string;
  supportsNativePdf?: boolean;
  supportsTools?: boolean;
  isRegeneration?: boolean;
  modelPricing?: { prompt: string; completion: string };
};

export async function handleChatRequest({ req, userId }: { req: Request; userId: string }) {
  const {
    messages,
    threadId,
    openrouterClientKey,
    parallelClientKey,
    searchEnabled,
    reasoningLevel,
    modelId,
    supportsNativePdf,
    supportsTools,
    isRegeneration,
    modelPricing,
  }: ChatRequestBody = await req.json();

  const baseModelId = modelId || "google/gemini-3-flash-preview";

  const [threadStatus, { settings, resolvedKeys }] = await Promise.all([
    threadId ? ensureThreadExists(threadId, userId) : Promise.resolve(null),
    getUserSettingsAndKeys(userId, {
      openrouter: openrouterClientKey,
      parallel: parallelClientKey,
    }),
  ]);

  const openrouterKey = resolvedKeys.openrouter;
  const parallelKey = searchEnabled ? resolvedKeys.parallel : undefined;

  if (threadStatus && !threadStatus.owned) {
    return new Response(JSON.stringify({ error: "Thread not found or unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!openrouterKey) {
    return new Response(JSON.stringify({ error: "No API key configured. Provide a browser key or store one on the server." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (searchEnabled && !parallelKey) {
    return new Response(JSON.stringify({ error: "Web search is enabled but no Parallel API key configured. Provide a browser key or store one on the server." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (threadId && !isRegeneration) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      saveMessage(threadId, userId, lastMessage, { searchEnabled, reasoningLevel })
        .catch((error) => {
          console.error("Failed to save user message", error);
        });
    }
  }

  const { stream, createMetadata } = await streamChatResponse(
    messages,
    baseModelId,
    openrouterKey,
    settings,
    userId,
    searchEnabled,
    parallelKey,
    {
      useOcrForPdfs: settings.useOcrForPdfs,
      supportsNativePdf: supportsNativePdf ?? false,
    },
    reasoningLevel,
    threadId,
    modelPricing,
    supportsTools,
  );

  if (threadId && messages.length === 1 && messages[0].role === "user") {
    const firstMessage = messages[0];
    const userMessage = firstMessage.parts
      ? firstMessage.parts
          .filter(p => p.type === "text")
          .map(p => (p as { text: string }).text)
          .join("")
      : "";

    if (settings.autoThreadNaming) {
      (async () => {
        try {
          const title = await generateThreadTitle(userMessage, openrouterKey);
          await renameThreadById(threadId, userId, title);
        }
        catch (error) {
          console.error("Failed to auto-rename thread", error);
        }
      })();
    }

    if (settings.autoThreadIcon && !settings.showSidebarIcons) {
      (async () => {
        try {
          const icon = await generateThreadIcon(userMessage, openrouterKey);
          await updateThreadIcon(threadId, userId, icon);
        }
        catch (error) {
          console.error("Failed to auto-update thread icon", error);
        }
      })();
    }
  }

  return stream.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: ({ part }) => {
      const metadata = createMetadata(part);
      return metadata;
    },
    onFinish: async ({ responseMessage }) => {
      if (threadId) {
        await saveMessage(threadId, userId, responseMessage);
      }
    },
    sendSources: true,
    sendReasoning: true,
    onError: (error) => {
      console.error("Chat stream error", error);
      return formatProviderError(error);
    },
    // TODO: Re-enable consumeStream when we can afford the CPU overhead of draining streams.
    // consumeSseStream: async (sseStream) => {
    //   after(async () => {
    //     await consumeStream(sseStream);
    //   });
    // },
  });
}
