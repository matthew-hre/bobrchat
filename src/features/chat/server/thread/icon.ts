import { generateText } from "ai";

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

/**
 * Generates an appropriate icon for a thread based on the first user message.
 * Uses a low-latency model to select the icon quickly.
 *
 * @param message The first message from the user.
 * @param apiKey The OpenRouter API key.
 * @returns {Promise<ThreadIcon>} The selected icon.
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
