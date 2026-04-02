import { generateText, Output } from "ai";
import * as z from "zod";

import type { ThreadIcon } from "~/lib/db/schema/chat";

import { logUtilityUsage } from "~/lib/db/queries/utility-usage";
import { THREAD_ICONS } from "~/lib/db/schema/chat";

import type { ResolvedProvider } from "../providers";

import { createAnthropicProvider, createOpenAIProvider, createOpenRouterProvider } from "../providers";

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

function createProvider(resolved: ResolvedProvider) {
  const factory = resolved.providerType === "openai"
    ? createOpenAIProvider(resolved.apiKey)
    : resolved.providerType === "anthropic"
      ? createAnthropicProvider(resolved.apiKey)
      : createOpenRouterProvider(resolved.apiKey);
  return factory(resolved.providerModelId);
}

/**
 * Generates a short title for a thread based on the first user message.
 * Used for user-triggered title regeneration.
 */
export async function generateThreadTitle(message: string, utilityProvider: ResolvedProvider, userId: string): Promise<string> {
  if (!message || message.trim().length === 0) {
    return "New Thread";
  }

  try {
    const model = createProvider(utilityProvider);

    const { text, usage } = await generateText({
      model,
      system: "Generate a short, concise title (max 6 words) for the thread based on the user's message. Do not include quotes or special characters. Do not respond to the message or respond with a question. Return ONLY the title.",
      messages: [{ role: "user", content: message }],
    });

    logUtilityUsage(userId, "title", utilityProvider.providerModelId, usage).catch(err => console.error("Failed to log utility usage:", err));

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
export async function generateThreadIcon(message: string, utilityProvider: ResolvedProvider, userId: string): Promise<ThreadIcon> {
  if (!message || message.trim().length === 0) {
    return "message-circle";
  }

  try {
    const model = createProvider(utilityProvider);

    const iconList = THREAD_ICONS.map(icon => `- ${icon}: ${ICON_DESCRIPTIONS[icon]}`).join("\n");

    const { text, usage } = await generateText({
      model,
      system: `Select the most appropriate icon for a thread based on the user's message.

Available icons:
${iconList}

Return ONLY the icon name. No explanation, no quotes, just the icon name.`,
      messages: [{ role: "user", content: message }],
    });

    logUtilityUsage(userId, "icon", utilityProvider.providerModelId, usage).catch(err => console.error("Failed to log utility usage:", err));

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
 * @param utilityProvider The resolved utility provider to use.
 * @returns {Promise<ThreadMetadata>} The generated title and icon.
 */
export async function generateThreadMetadata(message: string, utilityProvider: ResolvedProvider, userId: string): Promise<ThreadMetadata> {
  if (!message || message.trim().length === 0) {
    return { title: "New Thread", icon: "message-circle" };
  }

  try {
    const model = createProvider(utilityProvider);

    const iconList = THREAD_ICONS.map(icon => `- ${icon}: ${ICON_DESCRIPTIONS[icon]}`).join("\n");

    const { output, usage } = await generateText({
      model,
      output: Output.object({ schema: threadMetadataSchema }),
      system: `Based on the user's message, generate:
1. A short, concise title (max 6 words). No quotes or special characters. Do not respond to the message.
2. The most appropriate icon from the list below.

Available icons:
${iconList}`,
      messages: [{ role: "user", content: message }],
    });

    logUtilityUsage(userId, "metadata", utilityProvider.providerModelId, usage).catch(err => console.error("Failed to log utility usage:", err));

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

const threadTagsSchema = z.object({
  tagIds: z.array(z.string()),
});

/**
 * Selects relevant tags for a thread based on the first user message.
 * Returns an array of tag IDs that are strictly relevant to the conversation.
 *
 * @param message The first message from the user.
 * @param tags The available tags to choose from.
 * @param utilityProvider The resolved utility provider to use.
 * @returns {Promise<string[]>} The IDs of the selected tags.
 */
export async function generateThreadTags(
  message: string,
  tags: { id: string; name: string; description: string }[],
  utilityProvider: ResolvedProvider,
  userId: string,
): Promise<string[]> {
  if (!message || message.trim().length === 0 || tags.length === 0) {
    return [];
  }

  try {
    const model = createProvider(utilityProvider);

    const tagList = tags.map(tag => `- ${tag.id}: ${tag.name} — ${tag.description}`).join("\n");

    const { output, usage } = await generateText({
      model,
      output: Output.object({ schema: threadTagsSchema }),
      system: `Based on the user's message, select which tags are relevant to the conversation.
Be conservative — only apply tags that clearly match the topic. Never fabricate tag IDs.
Return ONLY tag IDs from the list below.

Available tags:
${tagList}`,
      messages: [{ role: "user", content: message }],
    });

    logUtilityUsage(userId, "tags", utilityProvider.providerModelId, usage).catch(err => console.error("Failed to log utility usage:", err));

    if (!output) {
      return [];
    }

    const validIds = new Set(tags.map(tag => tag.id));
    return output.tagIds.filter(id => validIds.has(id));
  }
  catch (error) {
    console.error("Failed to generate thread tags:", error);
    return [];
  }
}
