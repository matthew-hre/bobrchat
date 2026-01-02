import { generateId } from "ai";

import type { ChatUIMessage } from "~/app/api/chat/route";

/**
 * Create a user message from message parts
 */
export function createUserMessage(parts: any): ChatUIMessage {
  return {
    id: generateId(),
    role: "user",
    ...parts,
  };
}
