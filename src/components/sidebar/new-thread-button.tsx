"use client";

import { EyeOffIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { useChatUIStore } from "~/features/chat/store";
import { useSubscription } from "~/features/subscriptions/hooks/use-subscription";

type NewThreadButtonProps = {
  "className"?: string;
  "variant"?: "ghost" | "outline";
  "data-slot"?: string;
  "data-sidebar"?: string;
};

export function NewThreadButton({ className, variant = "ghost", ...props }: NewThreadButtonProps) {
  const router = useRouter();
  const setIncognito = useChatUIStore(state => state.setIncognito);
  const { data: subscription } = useSubscription();
  const isPlus = subscription?.tier === "plus";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button
          variant={variant}
          size="icon-sm"
          className={className ?? "size-7"}
          title="new thread"
          aria-label="new thread"
          asChild
          {...props}
        >
          <Link href="/" onClick={() => setIncognito(false)}>
            <PlusIcon className="size-4" />
          </Link>
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={() => {
            setIncognito(false);
            router.push("/");
          }}
        >
          <PlusIcon className="size-4" />
          New chat
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={!isPlus}
          onSelect={() => {
            setIncognito(true);
            router.push("/");
          }}
        >
          <EyeOffIcon className="size-4" />
          {isPlus ? "New incognito chat" : "New incognito chat (Plus)"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
