import { generateText, Output } from "ai";
import * as z from "zod";

import type { ThreadIcon } from "~/lib/db/schema/chat";

import { THREAD_ICONS } from "~/lib/db/schema/chat";

import { getModelProvider } from "../models";

const ICON_DESCRIPTIONS: Record<ThreadIcon, string> = {
  "message-circle": "general thread or casual conversation",
  "message-square": "formal discussion or Q&A",
  "sparkles": "creative, AI, or magical topics",
  "lightbulb": "ideas, brainstorming, or suggestions",
  "code": "programming, coding, or computing topics",
  "book": "learning, education, or reading",
  "file-text": "documents, writing, or notes",
  "star": "important or highlighted topics",
  "heart": "personal, emotional, or relationship topics",
  "zap": "quick tasks, productivity, or energy",
};

const threadMetadataSchema = z.object({
  title: z.string(),
  icon: z.enum(THREAD_ICONS),
});

export type ThreadMetadata = {
  title: string;
  icon: ThreadIcon;
};

/**
 * Generates a short title for a thread based on the first user message.
 * Used for user-triggered title regeneration.
 */
export async function generateThreadTitle(message: string, apiKey: string): Promise<string> {
  if (!message || message.trim().length === 0) {
    return "New Thread";
  }

  try {
    const provider = getModelProvider(apiKey);
    const model = provider("google/gemini-2.5-flash-lite");

    const { text } = await generateText({
      model,
      system: "Generate a short, concise title (max 6 words) for the thread based on the user's message. Do not include quotes or special characters. Do not respond to the message or respond with a question. Return ONLY the title.",
      messages: [{ role: "user", content: message }],
    });

    const title = text.trim().replace(/^["']|["']$/g, "").split("\n")[0];
    return title || "New Thread";
  }
  catch (error) {
    console.error("Failed to generate thread title:", error);
    return "New Thread";
  }
}

/**
 * Generates an appropriate icon for a thread based on the first user message.
 * Used for user-triggered icon regeneration.
 */
export async function generateThreadIcon(message: string, apiKey: string): Promise<ThreadIcon> {
  if (!message || message.trim().length === 0) {
    return "message-circle";
  }

  try {
    const provider = getModelProvider(apiKey);
    const model = provider("google/gemini-2.5-flash-lite");

    const iconList = THREAD_ICONS.map(icon => `- ${icon}: ${ICON_DESCRIPTIONS[icon]}`).join("\n");

    const { text } = await generateText({
      model,
      system: `Select the most appropriate icon for a thread based on the user's message.

Available icons:
${iconList}

Return ONLY the icon name. No explanation, no quotes, just the icon name.`,
      messages: [{ role: "user", content: message }],
    });

    const iconName = text.trim().toLowerCase() as ThreadIcon;

    if (THREAD_ICONS.includes(iconName)) {
      return iconName;
    }

    return "message-circle";
  }
  catch (error) {
    console.error("Failed to generate thread icon:", error);
    return "message-circle";
  }
}

/**
 * Generates a title and icon for a thread in a single LLM call.
 * Uses structured output to return both values at once, halving
 * the number of API round-trips compared to separate calls.
 *
 * @param message The first message from the user.
 * @param apiKey The OpenRouter API key.
 * @returns {Promise<ThreadMetadata>} The generated title and icon.
 */
export async function generateThreadMetadata(message: string, apiKey: string): Promise<ThreadMetadata> {
  if (!message || message.trim().length === 0) {
    return { title: "New Thread", icon: "message-circle" };
  }

  try {
    const provider = getModelProvider(apiKey);
    const model = provider("google/gemini-2.5-flash-lite");

    const iconList = THREAD_ICONS.map(icon => `- ${icon}: ${ICON_DESCRIPTIONS[icon]}`).join("\n");

    const { output } = await generateText({
      model,
      output: Output.object({ schema: threadMetadataSchema }),
      system: `Based on the user's message, generate:
1. A short, concise title (max 6 words). No quotes or special characters. Do not respond to the message.
2. The most appropriate icon from the list below.

Available icons:
${iconList}`,
      messages: [{ role: "user", content: message }],
    });

    if (!output) {
      return { title: "New Thread", icon: "message-circle" };
    }

    const title = output.title.trim().replace(/^["']|["']$/g, "").split("\n")[0];

    return {
      title: title || "New Thread",
      icon: THREAD_ICONS.includes(output.icon) ? output.icon : "message-circle",
    };
  }
  catch (error) {
    console.error("Failed to generate thread metadata:", error);
    return { title: "New Thread", icon: "message-circle" };
  }
}
