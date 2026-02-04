import * as z from "zod";

export const handoffInputSchema = z.object({
  objective: z
    .string()
    .max(500)
    .describe(
      "What the new thread should focus on. Describe the goal or topic for the handed-off conversation.",
    ),
});

export type HandoffInput = z.infer<typeof handoffInputSchema>;

export type HandoffOutput = {
  newThreadId: string;
  generatedPrompt: string;
  parentThreadId: string;
};

export type HandoffErrorOutput = {
  error: true;
  code: "generation_failed" | "thread_creation_failed";
  message: string;
};

export type HandoffToolOutput = HandoffOutput | HandoffErrorOutput;

export function isHandoffError(output: HandoffToolOutput): output is HandoffErrorOutput {
  return "error" in output && output.error === true;
}
