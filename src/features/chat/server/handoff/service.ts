import type { UIMessage } from "ai";

import { generateText } from "ai";

import { db } from "~/lib/db";
import { threads } from "~/lib/db/schema/chat";

import { getModelProvider } from "../models";

const HANDOFF_MODEL = "google/gemini-2.5-flash";

const HANDOFF_SYSTEM_PROMPT = `You are a context summarizer. Your job is to read a conversation and the user's handoff request, then generate a focused prompt for a new conversation thread.

The prompt you generate should:
1. Provide essential context from the previous conversation (key decisions, conclusions, relevant details)
2. Clearly state what the new conversation should focus on
3. Include any specific requirements or constraints mentioned
4. Be concise but complete - the new thread should not need to reference the old one
5. NOT include entire files or large code blocks - use excerpts or descriptions instead
6. Be written as if the user is starting a fresh conversation with a new assistant

Format the prompt naturally, as if the user wrote it themselves. Do not include meta-commentary about what you're doing.`;

function formatConversationForHandoff(messages: UIMessage[]): string {
  const formatted: string[] = [];

  for (const message of messages) {
    const role = message.role === "user" ? "User" : "Assistant";
    let content = "";

    if (message.parts) {
      for (const part of message.parts) {
        if (part.type === "text") {
          content += part.text;
        }
        else if (part.type === "file") {
          content += `[Attachment: ${part.filename || "file"}]`;
        }
        else if (part.type === "reasoning") {
          // Skip reasoning parts in handoff context
        }
        else if (part.type === "tool-search" || part.type === "tool-extract") {
          content += "[Web search performed]";
        }
      }
    }

    if (content.trim()) {
      formatted.push(`${role}: ${content.trim()}`);
    }
  }

  return formatted.join("\n\n");
}

export async function generateHandoffPrompt(
  messages: UIMessage[],
  objective: string,
  openRouterApiKey: string,
): Promise<string> {
  const provider = getModelProvider(openRouterApiKey);
  const conversationContext = formatConversationForHandoff(messages);

  const result = await generateText({
    model: provider(HANDOFF_MODEL),
    system: HANDOFF_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the conversation so far:

---
${conversationContext}
---

The user wants to hand off to a new thread with this objective: "${objective}"

Generate a focused prompt for the new conversation that captures the essential context and clearly states what should be discussed next.`,
      },
    ],
  });

  return result.text;
}

export async function createHandoffThread(
  userId: string,
  parentThreadId: string,
  title?: string,
): Promise<string> {
  const now = new Date();
  const newThreadId = crypto.randomUUID();

  await db.insert(threads).values({
    id: newThreadId,
    userId,
    title: title || "Handoff",
    parentThreadId,
    lastMessageAt: now,
  });

  return newThreadId;
}
