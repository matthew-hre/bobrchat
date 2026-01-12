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
  const { input, setInput, searchEnabled, setSearchEnabled, reasoningEnabled, setReasoningEnabled } = useChatUIStore();
  const createThread = useCreateThread();

  // TODO: Properly type this
  const handleSendMessage = async (messageParts: any) => {
    try {
      const threadId = await createThread.mutateAsync(settings?.defaultThreadName);
      const initialData = encodeURIComponent(JSON.stringify(messageParts));
      router.push(`/chat/${threadId}?initial=${initialData}`);
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
      onSearchChangeAction={setSearchEnabled}
      reasoningEnabled={reasoningEnabled}
      onReasoningChangeAction={setReasoningEnabled}
      landingPageContent={isLoading ? undefined : settings?.landingPageContent ?? "suggestions"}
      showLandingPage={!input.trim()}
    />
  );
}
