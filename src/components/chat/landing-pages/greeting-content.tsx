"use client";

import { useSession } from "~/lib/auth-client";

type GreetingContentProps = {
  children?: React.ReactNode;
};

export function GreetingContent({ children }: GreetingContentProps) {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0];

  if (!firstName) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">
          {`Hi ${firstName}, what's on your mind?`}
        </h2>
      </div>
      {children}
    </div>
  );
}
