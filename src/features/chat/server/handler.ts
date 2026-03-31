import { createUIMessageStream, createUIMessageStreamResponse, NoSuchToolError } from "ai";

import type { ResolvedProvider } from "~/features/chat/server/providers";
import type { ChatUIMessage } from "~/features/chat/types";
import type { ApiKeyProvider } from "~/lib/api-keys/types";

import { addTagToThread, ensureThreadExistsWithLimitCheck, listTagsByUserId, renameThreadById, saveMessage, updateThreadIcon } from "~/features/chat/queries";
import { formatProviderError } from "~/features/chat/server/error";
import { resolveProvider, resolveToolProvider } from "~/features/chat/server/providers";
import { streamChatResponse } from "~/features/chat/server/service";
import { generateThreadMetadata, generateThreadTags } from "~/features/chat/server/thread";
import { getUserSettingsAndKeys } from "~/features/settings/queries";
import { getUserTier } from "~/features/subscriptions/queries";

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

  const [threadStatus, { settings, resolvedKeys }, tier] = await Promise.all([
    threadId ? ensureThreadExistsWithLimitCheck(threadId, userId) : Promise.resolve(null),
    getUserSettingsAndKeys(userId, clientKeys),
    getUserTier(userId),
  ]);

  const parallelKey = searchEnabled ? resolvedKeys.parallel : undefined;

  if (threadStatus && !threadStatus.ok) {
    return new Response(JSON.stringify({
      error: threadStatus.reason,
      code: "THREAD_LIMIT_EXCEEDED",
      currentUsage: threadStatus.currentUsage,
      limit: threadStatus.limit,
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (threadStatus && threadStatus.ok && !threadStatus.owned) {
    return new Response(JSON.stringify({ error: "Thread not found or unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let resolved;
  try {
    resolved = await resolveProvider(baseModelId, resolvedKeys);
  }
  catch {
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

  const handoffProvider = resolveToolProvider(settings.toolHandoffModel, resolvedKeys, tier);

  const { stream, createMetadata } = await streamChatResponse(
    messages,
    baseModelId,
    resolved,
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
    settings.handoffEnabled,
    handoffProvider,
  );

  if (threadId && messages.length === 1 && messages[0].role === "user") {
    const wantsTitle = settings.autoThreadNaming;
    const wantsIcon = settings.autoThreadIcon && !settings.showSidebarIcons;

    if (wantsTitle || wantsIcon) {
      const titleProvider = wantsTitle ? resolveToolProvider(settings.toolTitleModel, resolvedKeys, tier) : undefined;
      const iconProvider = wantsIcon ? resolveToolProvider(settings.toolIconModel, resolvedKeys, tier) : undefined;

      if (titleProvider || iconProvider) {
        const firstMessage = messages[0];
        const userMessage = firstMessage.parts
          ? firstMessage.parts
              .filter(p => p.type === "text")
              .map(p => (p as { text: string }).text)
              .join("")
          : "";

        // Use the title provider if available, else icon provider
        const metadataProvider = (titleProvider ?? iconProvider)!;

        generateThreadMetadata(userMessage, metadataProvider)
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
  }

  if (threadId && settings.autoTagging) {
    const tagProvider = resolveToolProvider(settings.toolTagModel, resolvedKeys, tier);

    if (tagProvider) {
      const firstMessage = messages[messages.length - 1];
      const userContent = firstMessage?.parts
        ? firstMessage.parts
            .filter(p => p.type === "text")
            .map(p => (p as { text: string }).text)
            .join("")
        : "";

      listTagsByUserId(userId)
        .then(allTags => allTags.filter(t => t.description !== null && t.description.trim().length > 0))
        .then(tagsWithDesc => generateThreadTags(
          userContent,
          tagsWithDesc as { id: string; name: string; description: string }[],
          tagProvider,
        ))
        .then(async (tagIds) => {
          await Promise.all(tagIds.map(tagId => addTagToThread(userId, threadId, tagId)));
        })
        .catch((error) => {
          console.error("Failed to auto-tag thread", error);
        });
    }
  }

  const openrouterKey = resolvedKeys.openrouter;
  const canFallback = resolved.providerType !== "openrouter" && !!openrouterKey;

  const onError = (error: unknown) => {
    if (!NoSuchToolError.isInstance(error)) {
      console.error("Chat stream error", error);
    }
    return formatProviderError(error);
  };

  const uiStream = createUIMessageStream({
    originalMessages: messages,
    onError,
    onFinish: async ({ responseMessage }) => {
      if (threadId) {
        await saveMessage(threadId, userId, responseMessage);
      }
    },
    execute: async ({ writer }) => {
      const toUIStream = (s: typeof stream, meta: typeof createMetadata) =>
        s.toUIMessageStream({
          originalMessages: messages,
          messageMetadata: ({ part }) => meta(part),
          sendSources: true,
          sendReasoning: true,
          onError,
        });

      if (!canFallback) {
        writer.merge(toUIStream(stream, createMetadata));
        return;
      }

      const primaryStream = toUIStream(stream, createMetadata);
      const reader = primaryStream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done)
            break;
          writer.write(value);
        }
      }
      catch (error) {
        console.error("Direct provider failed, falling back to OpenRouter", error);

        const fallbackProvider: ResolvedProvider = {
          providerType: "openrouter",
          providerModelId: baseModelId,
          apiKey: openrouterKey!,
        };

        const fallback = await streamChatResponse(
          messages,
          baseModelId,
          fallbackProvider,
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
          settings.handoffEnabled,
          handoffProvider,
        );

        writer.merge(toUIStream(fallback.stream, fallback.createMetadata));
      }
    },
  });

  return createUIMessageStreamResponse({ stream: uiStream });
}
