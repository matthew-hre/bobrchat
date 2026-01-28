import type { UIMessage } from "ai";

import * as Sentry from "@sentry/nextjs";
import { consumeStream } from "ai";
import { headers } from "next/headers";
import { after } from "next/server";

import { auth } from "~/features/auth/lib/auth";
import { ensureThreadExists, renameThreadById, saveMessage } from "~/features/chat/queries";
import { formatProviderError } from "~/features/chat/server/error";
import { generateThreadTitle } from "~/features/chat/server/naming";
import { streamChatResponse } from "~/features/chat/server/service";
import { getUserSettingsAndKeys } from "~/features/settings/queries";

export type CostBreakdown = {
  model: number;
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
  return Sentry.startSpan(
    { op: "http.server", name: "POST /api/chat" },
    async (span) => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { messages, threadId, openrouterClientKey, parallelClientKey, searchEnabled, reasoningLevel, modelId, supportsNativePdf, isRegeneration }: { messages: ChatUIMessage[]; threadId?: string; openrouterClientKey?: string; parallelClientKey?: string; searchEnabled?: boolean; reasoningLevel?: string; modelId?: string; supportsNativePdf?: boolean; isRegeneration?: boolean }
        = await req.json();

      const baseModelId = modelId || "google/gemini-3-flash-preview";

      span.setAttribute("chat.model", baseModelId);
      span.setAttribute("chat.messageCount", messages.length);
      span.setAttribute("chat.searchEnabled", searchEnabled ?? false);
      span.setAttribute("chat.reasoningLevel", reasoningLevel ?? "none");
      span.setAttribute("chat.isRegeneration", isRegeneration ?? false);

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
              Sentry.captureException(error, { tags: { operation: "save-user-message" } });
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
              Sentry.captureException(error, { tags: { operation: "auto-rename" } });
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
          Sentry.captureException(error, { tags: { operation: "chat-stream" } });
          return formatProviderError(error);
        },
        consumeSseStream: async (sseStream) => {
          after(async () => {
            await consumeStream(sseStream);
          });
        },
      });

      return response;
    },
  );
}
