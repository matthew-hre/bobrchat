"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export type ParentThreadLinkProps = {
  parentId: string;
  parentTitle: string;
};

export function ParentThreadLink({ parentId, parentTitle }: ParentThreadLinkProps) {
  return (
    <div className="border-border/50 bg-muted/30 flex items-center gap-2 border-b px-4 py-2">
      <ArrowLeft className="text-muted-foreground h-4 w-4" />
      <span className="text-muted-foreground text-sm">Continued from</span>
      <Link
        href={`/chat/${parentId}`}
        className="text-primary text-sm font-medium hover:underline"
      >
        {parentTitle}
      </Link>
    </div>
  );
}
