import { generateText } from "ai";

import { getModelProvider } from "../models";

/**
 * Generates a short title for a chat thread based on the first user message.
 * Uses a low-latency model to generate the title quickly.
 *
 * @param message The first message from the user.
 * @param apiKey The OpenRouter API key.
 * @returns {Promise<string>} The generated title.
 */
export async function generateThreadTitle(message: string, apiKey: string): Promise<string> {
  // Ensure we have a valid message to generate a title from
  if (!message || message.trim().length === 0) {
    return "New Chat";
  }

  try {
    const provider = getModelProvider(apiKey);

    // Use a fast model for title generation
    const model = provider("google/gemini-2.5-flash");

    const { text } = await generateText({
      model,
      system: "Generate a short, concise title (max 6 words) for the chat thread based on the user's message. Do not include quotes or special characters. Do not respond to the message or respond with a question. Return ONLY the title.",
      messages: [{ role: "user", content: message }],
    });

    // Clean up the generated text. Use only the first line, trimmed of whitespace and quotes.
    const title = text.trim().replace(/^["']|["']$/g, "").split("\n")[0];

    return title || "New Chat";
  }
  catch (error) {
    console.error("Failed to generate thread title:", error);
    return "New Chat";
  }
}
