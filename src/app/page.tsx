"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ChatView } from "~/components/chat/chat-view";
import { useSession } from "~/lib/auth-client";
import { useCreateThread } from "~/lib/queries/use-threads";
import { useUserSettings } from "~/lib/queries/use-user-settings";
import { useChatUIStore } from "~/lib/stores/chat-ui-store";

export default function HomePage(): React.ReactNode {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: settings, isLoading } = useUserSettings({
    enabled: !!session,
  });
  const { input, setInput, searchEnabled, setSearchEnabled, setPendingMessage } = useChatUIStore();
  const createThread = useCreateThread();

  // TODO: Properly type this
  const handleSendMessage = async (messageParts: any) => {
    try {
      const threadId = await createThread.mutateAsync(settings?.defaultThreadName);
      setPendingMessage(messageParts);
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
      input={input}
      setInput={setInput}
      sendMessage={handleSendMessage}
      isLoading={createThread.isPending}
      searchEnabled={searchEnabled}
      onSearchChange={setSearchEnabled}
      landingPageContent={isLoading ? undefined : settings?.landingPageContent ?? "suggestions"}
      showLandingPage={!input.trim()}
    />
  );
}
