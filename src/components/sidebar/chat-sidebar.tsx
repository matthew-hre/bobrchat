"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarTrigger,
} from "~/components/ui/sidebar";

import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { UserProfileCard } from "./user-profile-card";

export function ChatSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-0">
        <div className="flex h-14 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight">
                BobrChat
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">

            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7"
              title="New chat"
              asChild
            >
              <Link href="/">
                <PlusIcon className="size-4" />
              </Link>
            </Button>
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter className="p-0">
        <Suspense
          fallback={(
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          )}
        >
          <UserProfileCard onProfileClick={() => (true)} />
        </Suspense>
      </SidebarFooter>
    </Sidebar>
  );
}
