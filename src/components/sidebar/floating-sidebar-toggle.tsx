"use client";

import { PanelLeftIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "~/components/ui/button";
import { useSidebar } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";

export function FloatingSidebarToggle() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname();
  const isSharePage = pathname?.startsWith("/share");

  const isVisible = (state === "collapsed" || isMobile) && !isSharePage;

  return (
    <div
      data-slot="floating-sidebar-toggle-container"
      data-sidebar="floating-toggle"
      data-state={isVisible ? "open" : "closed"}
      className={cn(
        `
          pointer-events-none fixed top-4 left-4 z-40 space-x-2 duration-300
          ease-in-out
        `,
        !isSharePage ? "block" : "hidden",
        isVisible
          ? "animate-in slide-in-from-left-12"
          : "invisible -translate-x-12 opacity-0",
      )}
    >
      <Button
        data-slot="floating-sidebar-toggle"
        data-sidebar="floating-toggle-button"
        variant="ghost"
        size="icon-sm"
        className={`
          bg-background pointer-events-auto size-7 border
          hover:bg-muted
          dark:hover:bg-muted
        `}
        title="New Thread"
        aria-label="New Thread"
        asChild
      >
        <Link href="/">
          <PlusIcon className="size-4" />
        </Link>
      </Button>
      <Button
        data-slot="floating-sidebar-toggle"
        data-sidebar="floating-toggle-button"
        variant="ghost"
        size="icon-sm"
        className={`
          bg-background pointer-events-auto size-7 border
          hover:bg-muted
          dark:hover:bg-muted
        `}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
        aria-label="Toggle Sidebar"
      >
        <PanelLeftIcon className="size-4" />
      </Button>
    </div>
  );
}
