"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useSession } from "~/features/auth/lib/auth-client";
import { ChatView } from "~/features/chat/components/chat-view";
import { useCreateThread } from "~/features/chat/hooks/use-threads";
import { useChatUIStore } from "~/features/chat/store";
import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

export default function HomePage(): React.ReactNode {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: settings, isLoading } = useUserSettings({
    enabled: !!session,
  });
  const input = useChatUIStore(state => state.input);
  const createThread = useCreateThread();

  // TODO: Properly type this
  const handleSendMessage = async (messageParts: any) => {
    try {
      const threadId = await createThread.mutateAsync(settings?.defaultThreadName);

      // Store initial message in sessionStorage to avoid URL length limits
      // Messages longer than ~2000 chars were getting truncated when URL-encoded
      sessionStorage.setItem(`initial_${threadId}`, JSON.stringify(messageParts));

      router.push(`/chat/${threadId}`);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create thread. Please try again.";
      toast.error(message);
    }
  };

  return (
    <ChatView
      messages={[]}
      sendMessage={handleSendMessage}
      isLoading={createThread.isPending}
      landingPageContent={isLoading ? undefined : settings?.landingPageContent ?? "suggestions"}
      showLandingPage={!input.trim()}
    />
  );
}
