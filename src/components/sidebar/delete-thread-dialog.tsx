"use client";

import { useRouter } from "next/navigation";
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
import { useDeleteThread } from "~/lib/queries/use-threads";

type DeleteThreadDialogProps = {
  open: boolean;
  threadId: string;
  threadTitle: string;
  onOpenChange: (open: boolean) => void;
};

export function DeleteThreadDialog({
  open,
  threadId,
  threadTitle,
  onOpenChange,
}: DeleteThreadDialogProps) {
  const router = useRouter();
  const deleteThreadMutation = useDeleteThread();

  const handleDelete = async () => {
    try {
      await deleteThreadMutation.mutateAsync(threadId);
      onOpenChange(false);
      router.push("/");
    }
    catch (error) {
      console.error("Failed to delete thread:", error);
      toast.error("Failed to delete thread. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Thread</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "
            {threadTitle}
            "? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteThreadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteThreadMutation.isPending}
          >
            {deleteThreadMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
