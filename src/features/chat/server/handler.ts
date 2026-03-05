import { NoSuchToolError } from "ai";

import type { ChatUIMessage } from "~/features/chat/types";
import type { ApiKeyProvider } from "~/lib/api-keys/types";

import { ensureThreadExists, renameThreadById, saveMessage, updateThreadIcon } from "~/features/chat/queries";
import { formatProviderError } from "~/features/chat/server/error";
import { streamChatResponse } from "~/features/chat/server/service";
import { generateThreadMetadata } from "~/features/chat/server/thread";
import { getUserSettingsAndKeys } from "~/features/settings/queries";

type ChatRequestBody = {
  messages: ChatUIMessage[];
  threadId?: string;
  clientKeys?: Partial<Record<ApiKeyProvider, string>>;
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
    clientKeys,
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
    getUserSettingsAndKeys(userId, clientKeys),
  ]);

  const openrouterKey = resolvedKeys.openrouter;
  const parallelKey = searchEnabled ? resolvedKeys.parallel : undefined;

  // Check if the user has a direct key matching the model's provider prefix (e.g. "openai" → resolvedKeys.openai)
  const modelPrefix = baseModelId.split("/")[0] as ApiKeyProvider;
  const hasAnyModelKey = !!resolvedKeys[modelPrefix] || !!openrouterKey;

  if (threadStatus && !threadStatus.owned) {
    return new Response(JSON.stringify({ error: "Thread not found or unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!hasAnyModelKey) {
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
      saveMessage(threadId, userId, lastMessage, { searchEnabled, reasoningLevel, modelId: baseModelId })
        .catch((error) => {
          console.error("Failed to save user message", error);
        });
    }
  }

  const { stream, createMetadata } = await streamChatResponse(
    messages,
    baseModelId,
    resolvedKeys,
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
    const wantsTitle = settings.autoThreadNaming;
    const wantsIcon = settings.autoThreadIcon && !settings.showSidebarIcons;

    if ((wantsTitle || wantsIcon) && openrouterKey) {
      const firstMessage = messages[0];
      const userMessage = firstMessage.parts
        ? firstMessage.parts
            .filter(p => p.type === "text")
            .map(p => (p as { text: string }).text)
            .join("")
        : "";

      generateThreadMetadata(userMessage, openrouterKey)
        .then(async (metadata) => {
          await Promise.all([
            wantsTitle ? renameThreadById(threadId, userId, metadata.title) : Promise.resolve(),
            wantsIcon ? updateThreadIcon(threadId, userId, metadata.icon) : Promise.resolve(),
          ]);
        })
        .catch((error) => {
          console.error("Failed to generate thread metadata", error);
        });
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
      if (!NoSuchToolError.isInstance(error)) {
        console.error("Chat stream error", error);
      }
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
