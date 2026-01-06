"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { ChatUIMessage } from "~/app/api/chat/route";

import { ChatView } from "~/components/chat/chat-view";
import { useModelContext } from "~/components/chat/model-context";
import { useUserSettingsContext } from "~/components/settings/user-settings-provider";
import { useChatInputFeatures } from "~/hooks/use-chat-input-features";
import { createUserMessage } from "~/lib/utils/messages";
import { createNewThread, saveUserMessage } from "~/server/actions/chat";

export default function HomePage(): React.ReactNode {
    const router = useRouter();
    const { settings, loading } = useUserSettingsContext();
    const { selectedModelId, setSelectedModelId } = useModelContext();
    const [input, setInput] = useState<string>("");
    const threadIdRef = useRef<string | null>(null);
    const [browserApiKey, setBrowserApiKey] = useState<string | null>(null);
    const browserApiKeyRef = useRef<string | null>(null);
    const selectedModelIdRef = useRef<string | null>(null);

    const { features, getLatestValues } = useChatInputFeatures(
        { key: "search", defaultValue: false, persist: true },
    );

    useEffect(() => {
        const key = localStorage.getItem("openrouter_api_key");
        if (key) {
            setBrowserApiKey(key);
            browserApiKeyRef.current = key;
        }
    }, []);

    useEffect(() => {
        browserApiKeyRef.current = browserApiKey;
    }, [browserApiKey]);

    useEffect(() => {
        selectedModelIdRef.current = selectedModelId;
    }, [selectedModelId]);

    const { messages, sendMessage, status } = useChat<ChatUIMessage>({
        transport: new DefaultChatTransport({
            api: "/api/chat",
            prepareSendMessagesRequest: ({ messages: allMessages }) => {
                const latestValues = getLatestValues();
                const body = {
                    messages: allMessages,
                    threadId: threadIdRef.current,
                    searchEnabled: latestValues.search,
                    ...(browserApiKeyRef.current && { browserApiKey: browserApiKeyRef.current }),
                    ...(selectedModelIdRef.current && { modelId: selectedModelIdRef.current }),
                };
                return { body };
            },
        }),
        onError: (error) => {
            toast.error(error.message || "Failed to send message");
        },
    });

    const handleSendMessage = async (messageParts: any) => {
        const userMessage = createUserMessage(messageParts);

        try {
            const threadId = await createNewThread(settings?.defaultThreadName);
            threadIdRef.current = threadId;

            // Save the user message
            await saveUserMessage(threadId, userMessage);

            // Send the message and wait for it to complete
            await sendMessage(messageParts);

            // Navigate to the thread after message is sent
            router.push(`/chat/${threadId}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to send message. Please try again.";
            toast.error(message);
        }
    };

    return (
        <ChatView
            messages={messages}
            input={input}
            setInput={setInput}
            sendMessage={handleSendMessage}
            isLoading={status === "submitted" || status === "streaming"}
            searchEnabled={features.search.value}
            onSearchChange={(enabled) => {
                features.search.setValue(enabled);
            }}
            landingPageContent={loading ? undefined : settings?.landingPageContent ?? "suggestions"}
            showLandingPage={!input.trim()}
        />
    );
}
