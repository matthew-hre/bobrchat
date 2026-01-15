import type { Metadata } from "next";

import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "~/features/auth/lib/auth";
import { SharedChatMessages } from "~/features/chat/components/shared-chat-messages";
import { sanitizeMessagesForSharing } from "~/features/chat/lib/sanitize-shared-messages";
import { getMessagesByThreadId, getThreadById } from "~/features/chat/queries";
import { getShareByShareId } from "~/features/chat/sharing-queries";

type SharePageProps = {
  params: Promise<{ shareId: string }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params;

  const [share, session] = await Promise.all([
    getShareByShareId(shareId),
    auth.api.getSession({ headers: await headers() }),
  ]);
  const isLoggedIn = !!session;

  if (!share) {
    return (
      <div className={`
        flex min-h-screen flex-col items-center justify-center gap-4 p-4
      `}
      >
        <h1 className="text-2xl font-semibold">Thread Unavailable</h1>
        <p className="text-muted-foreground text-center">
          This shared thread is no longer available or has been removed.
        </p>
        <Link
          href="/"
          className={`
            text-primary
            hover:underline
          `}
        >
          Go to BobrChat
        </Link>
      </div>
    );
  }

  const [thread, messages] = await Promise.all([
    getThreadById(share.threadId),
    getMessagesByThreadId(share.threadId),
  ]);

  if (!thread) {
    return (
      <div className={`
        flex min-h-screen flex-col items-center justify-center gap-4 p-4
      `}
      >
        <h1 className="text-2xl font-semibold">Thread Unavailable</h1>
        <p className="text-muted-foreground text-center">
          This shared thread is no longer available or has been removed.
        </p>
        <Link
          href="/"
          className={`
            text-primary
            hover:underline
          `}
        >
          Go to BobrChat
        </Link>
      </div>
    );
  }

  const sanitizedMessages = sanitizeMessagesForSharing(messages, {
    showAttachments: share.showAttachments,
  });

  return (
    <div className="min-h-screen">
      <header className={`
        bg-background/80 sticky top-0 z-10 border-b backdrop-blur
      `}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{thread.title}</h1>
            <p className="text-muted-foreground text-sm">
              Shared conversation
            </p>
          </div>
          {!isLoggedIn && (
            <Link
              href="/"
              className={`
                bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm
                font-medium transition-colors
                hover:bg-primary/90
              `}
            >
              Try BobrChat
            </Link>
          )}
        </div>
      </header>

      <main>
        <SharedChatMessages
          messages={sanitizedMessages}
          showAttachments={share.showAttachments}
        />
      </main>

      {!isLoggedIn && (
        <footer className="border-t py-8 text-center">
          <p className="text-muted-foreground text-sm">
            This is a shared conversation from
            {" "}
            <Link
              href="/"
              className={`
                text-primary
                hover:underline
              `}
            >
              BobrChat
            </Link>
          </p>
        </footer>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { shareId } = await params;

  const share = await getShareByShareId(shareId);
  if (!share) {
    return {
      title: "Thread Unavailable - BobrChat",
      robots: { index: false, follow: false },
    };
  }

  const thread = await getThreadById(share.threadId);
  if (!thread) {
    return {
      title: "Thread Unavailable - BobrChat",
      robots: { index: false, follow: false },
    };
  }

  const title = `${thread.title} - Shared from BobrChat`;
  const description = "A shared conversation from BobrChat";

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "BobrChat",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
