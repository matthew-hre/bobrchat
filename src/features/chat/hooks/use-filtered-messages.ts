import { useMemo } from "react";

import type { ChatUIMessage } from "~/features/chat/types";

import {
  isReasoningPart,
  isTextPart,
  isToolPart,
} from "~/features/chat/types";

/**
 * Filters out duplicate incomplete assistant messages.
 * When a response is stopped, there may be two messages with the same tool calls or reasoning -
 * one incomplete (not marked stopped) and one properly marked as stopped.
 */
export function useFilteredMessages(messages: ChatUIMessage[]): ChatUIMessage[] {
  return useMemo(() => {
    const extractSignatures = (parts: ChatUIMessage["parts"]) => {
      const toolIds: string[] = [];
      const reasoningTexts: string[] = [];
      const textParts: string[] = [];

      for (const part of parts) {
        if (isToolPart(part)) {
          toolIds.push(part.toolCallId);
        }
        else if (isReasoningPart(part)) {
          reasoningTexts.push(part.text || "");
        }
        else if (isTextPart(part)) {
          textParts.push(part.text);
        }
      }

      // Truncate text-based signatures to limit memory usage
      const reasoningText = reasoningTexts.join("").slice(0, 200);
      const textContent = textParts.join("").slice(0, 200);

      return {
        tool: toolIds.length > 0 ? `tool:${toolIds.sort().join("|")}` : null,
        reasoning: reasoningText ? `reasoning:${reasoningText}` : null,
        text: textContent ? `text:${textContent}` : null,
      };
    };

    // First pass: collect stopped message signatures and track candidate duplicates
    const stoppedSignatures = new Set<string>();
    const candidateDuplicates: Array<{ index: number }> = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (message.role !== "assistant")
        continue;

      if (message.stoppedByUser === true) {
        const sigs = extractSignatures(message.parts);
        if (sigs.tool)
          stoppedSignatures.add(sigs.tool);
        if (sigs.reasoning)
          stoppedSignatures.add(sigs.reasoning);
        if (sigs.text)
          stoppedSignatures.add(sigs.text);
      }
      else {
        candidateDuplicates.push({ index: i });
      }
    }

    // Early exit: no stopped messages means no duplicates possible
    if (stoppedSignatures.size === 0) {
      return messages;
    }

    // Extract signatures for candidate duplicates and build exclusion set
    const excludeIndices = new Set<number>();
    for (const candidate of candidateDuplicates) {
      const sigs = extractSignatures(messages[candidate.index].parts);

      const isDuplicate
        = (sigs.tool && stoppedSignatures.has(sigs.tool))
          || (sigs.reasoning && stoppedSignatures.has(sigs.reasoning))
          || (sigs.text && stoppedSignatures.has(sigs.text));

      if (isDuplicate) {
        excludeIndices.add(candidate.index);
      }
    }

    return messages.filter((_, i) => !excludeIndices.has(i));
  }, [messages]);
}
