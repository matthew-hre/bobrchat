import type { InferUITools, UIMessage } from "ai";

import { tool } from "ai";

import type { HandoffToolOutput } from "./types";

import { createHandoffThread, generateHandoffPrompt } from "./service";
import { handoffInputSchema } from "./types";

const HANDOFF_DESCRIPTION = `Hand off the conversation to a new thread with focused context. Use this when:
- The conversation has become long and a fresh start would help
- The user wants to explore a specific topic from the conversation in depth
- The user explicitly asks to "hand off" or start a new thread about something

Guidelines:
- Provide a clear objective describing what the new thread should focus on
- The new thread will receive a summarized context, not the full conversation
- The user will be navigated to the new thread automatically`;

export function createHandoffTool(
  userId: string,
  currentThreadId: string,
  messages: UIMessage[],
  openRouterApiKey: string,
) {
  return {
    handoff: tool({
      description: HANDOFF_DESCRIPTION,
      inputSchema: handoffInputSchema,
      execute: async ({ objective }): Promise<HandoffToolOutput> => {
        try {
          const generatedPrompt = await generateHandoffPrompt(
            messages,
            objective,
            openRouterApiKey,
          );

          const newThreadId = await createHandoffThread(
            userId,
            currentThreadId,
            `Handoff: ${objective.slice(0, 50)}${objective.length > 50 ? "..." : ""}`,
          );

          return {
            newThreadId,
            generatedPrompt,
            parentThreadId: currentThreadId,
          };
        }
        catch (error) {
          console.error("Handoff failed:", error);
          return {
            error: true,
            code: "generation_failed",
            message: error instanceof Error ? error.message : "Failed to generate handoff",
          };
        }
      },
    }),
  } as const;
}

export type HandoffTools = ReturnType<typeof createHandoffTool>;

export type HandoffUITools = InferUITools<HandoffTools>;
