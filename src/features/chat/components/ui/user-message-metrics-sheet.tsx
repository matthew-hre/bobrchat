"use client";

import { CheckIcon, CopyIcon, EditIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useCopyToClipboard } from "~/lib/hooks";

type UserMessageMetricsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onEdit?: () => void;
};

export function UserMessageMetricsSheet({
  open,
  onOpenChange,
  content,
  onEdit,
}: UserMessageMetricsSheetProps) {
  const { copied, copy } = useCopyToClipboard({
    errorMessage: "Failed to copy message content",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl gap-0">
        <SheetHeader>
          <SheetTitle className="text-sm">Message Actions</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-2 px-4 pb-6">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onEdit();
                onOpenChange(false);
              }}
              className="h-8 gap-2"
            >
              <EditIcon className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => copy(content)}
            className="h-8 gap-2"
          >
            {copied
              ? <CheckIcon className="h-3.5 w-3.5" />
              : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
