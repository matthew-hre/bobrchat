"use client";

import { Check, Copy, Loader2, StopCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { useCreateOrUpdateShare, useStopSharing, useThreadShareStatus } from "~/features/chat/hooks/use-thread-sharing";

type ShareThreadDialogProps = {
  open: boolean;
  threadId: string;
  threadTitle: string;
  onOpenChange: (open: boolean) => void;
};

export function ShareThreadDialog({
  open,
  threadId,
  threadTitle,
  onOpenChange,
}: ShareThreadDialogProps) {
  const { data: shareStatus, isLoading: isLoadingStatus } = useThreadShareStatus(open ? threadId : null);
  const createOrUpdateMutation = useCreateOrUpdateShare();
  const stopSharingMutation = useStopSharing();

  const [showAttachments, setShowAttachments] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync toggle state with server state when loaded
  useEffect(() => {
    if (shareStatus && !shareStatus.isRevoked) {
      setShowAttachments(shareStatus.showAttachments);
    }
  }, [shareStatus]);

  const isShared = shareStatus && !shareStatus.isRevoked;
  const shareUrl = isShared
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${shareStatus.shareUrl}`
    : null;

  const handleShare = async () => {
    try {
      const result = await createOrUpdateMutation.mutateAsync({ threadId, showAttachments });
      const fullUrl = `${window.location.origin}${result.shareUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Share link copied to clipboard");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    catch (error) {
      console.error("Failed to create share:", error);
      toast.error("Failed to create share link");
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl)
      return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    catch {
      toast.error("Failed to copy link");
    }
  };

  const handleStopSharing = async () => {
    try {
      await stopSharingMutation.mutateAsync(threadId);
      toast.success("Share link revoked");
    }
    catch (error) {
      console.error("Failed to stop sharing:", error);
      toast.error("Failed to revoke share link");
    }
  };

  const handleUpdateSettings = async () => {
    if (!isShared)
      return;
    try {
      await createOrUpdateMutation.mutateAsync({ threadId, showAttachments });
      toast.success("Share settings updated");
    }
    catch (error) {
      console.error("Failed to update share:", error);
      toast.error("Failed to update share settings");
    }
  };

  const isPending = createOrUpdateMutation.isPending || stopSharingMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Thread</DialogTitle>
          <DialogDescription>
            Share "
            {threadTitle}
            " via a public link. Anyone with the link can view this conversation.
          </DialogDescription>
        </DialogHeader>

        {isLoadingStatus
          ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )
          : (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-attachments">Show attachments</Label>
                    <p className="text-muted-foreground text-sm">
                      When off, only file names are visible
                    </p>
                  </div>
                  <Switch
                    id="show-attachments"
                    checked={showAttachments}
                    onCheckedChange={setShowAttachments}
                    disabled={isPending}
                  />
                </div>

                {isShared && shareUrl && (
                  <div className={`
                    bg-muted flex items-center gap-2 rounded-md p-3
                  `}
                  >
                    <code className="flex-1 truncate text-sm">{shareUrl}</code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleCopyLink}
                      disabled={isPending}
                    >
                      {copied
                        ? <Check className="size-4" />
                        : (
                            <Copy className="size-4" />
                          )}
                    </Button>
                  </div>
                )}
              </div>
            )}

        <DialogFooter className={`
          flex-col gap-2
          sm:flex-row
        `}
        >
          {isShared
            ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleStopSharing}
                    disabled={isPending}
                    className={`
                      w-full
                      sm:w-auto
                    `}
                  >
                    {stopSharingMutation.isPending
                      ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )
                      : (
                          <StopCircle className="mr-2 size-4" />
                        )}
                    Stop Sharing
                  </Button>
                  <Button
                    onClick={handleUpdateSettings}
                    disabled={isPending || shareStatus?.showAttachments === showAttachments}
                    className={`
                      w-full
                      sm:w-auto
                    `}
                  >
                    {createOrUpdateMutation.isPending
                      ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )
                      : null}
                    Update Settings
                  </Button>
                </>
              )
            : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleShare} disabled={isPending}>
                    {createOrUpdateMutation.isPending
                      ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )
                      : (
                          <Copy className="mr-2 size-4" />
                        )}
                    Create & Copy Link
                  </Button>
                </>
              )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
