import type { UIMessage } from "ai";

import { consumeStream } from "ai";
import { headers } from "next/headers";
import { after } from "next/server";

import { auth } from "~/features/auth/lib/auth";
import { ensureThreadExists, renameThreadById, saveMessage, updateThreadIcon } from "~/features/chat/queries";
import { formatProviderError } from "~/features/chat/server/error";
import { generateThreadIcon } from "~/features/chat/server/icon-selection";
import { generateThreadTitle } from "~/features/chat/server/naming";
import { streamChatResponse } from "~/features/chat/server/service";
import { chatRateLimit, rateLimitResponse } from "~/lib/rate-limit";
import { getUserSettingsAndKeys } from "~/features/settings/queries";

export type CostBreakdown = {
  promptCost: number;
  completionCost: number;
  search: number;
  extract: number;
  ocr: number;
  total: number;
};

export type MessageMetadata = {
  inputTokens: number;
  outputTokens: number;
  costUSD: CostBreakdown;
  model: string;
  tokensPerSecond: number;
  timeToFirstTokenMs: number;
};

export type ChatUIMessage = UIMessage<MessageMetadata> & {
  stoppedByUser?: boolean;
  stoppedModelId?: string | null;
  searchEnabled?: boolean | null;
  reasoningLevel?: string | null;
};

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { success, reset } = await chatRateLimit.limit(session.user.id);
  if (!success) {
    return rateLimitResponse(reset);
  }

  const { messages, threadId, openrouterClientKey, parallelClientKey, searchEnabled, reasoningLevel, modelId, supportsNativePdf, isRegeneration, modelPricing }: { messages: ChatUIMessage[]; threadId?: string; openrouterClientKey?: string; parallelClientKey?: string; searchEnabled?: boolean; reasoningLevel?: string; modelId?: string; supportsNativePdf?: boolean; isRegeneration?: boolean; modelPricing?: { prompt: string; completion: string } }
    = await req.json();

  const baseModelId = modelId || "google/gemini-3-flash-preview";

  const [threadStatus, { settings, resolvedKeys }] = await Promise.all([
    threadId ? ensureThreadExists(threadId, session.user.id) : Promise.resolve(null),
    getUserSettingsAndKeys(session.user.id, {
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
      saveMessage(threadId, session.user.id, lastMessage, { searchEnabled, reasoningLevel })
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
    session.user.id,
    searchEnabled,
    parallelKey,
    undefined,
    {
      useOcrForPdfs: settings.useOcrForPdfs,
      supportsNativePdf: supportsNativePdf ?? false,
    },
    reasoningLevel,
    threadId,
    modelPricing,
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
          await renameThreadById(threadId, session.user.id, title);
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
          await updateThreadIcon(threadId, session.user.id, icon);
        }
        catch (error) {
          console.error("Failed to auto-update thread icon", error);
        }
      })();
    }
  }

  const response = stream.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: ({ part }) => {
      const metadata = createMetadata(part);
      return metadata;
    },
    onFinish: async ({ responseMessage }) => {
      if (threadId) {
        await saveMessage(threadId, session.user.id, responseMessage);
      }
    },
    sendSources: true,
    sendReasoning: true,
    onError: (error) => {
      console.error("Chat stream error", error);
      return formatProviderError(error);
    },
    consumeSseStream: async (sseStream) => {
      after(async () => {
        await consumeStream(sseStream);
      });
    },
  });

  return response;
}
