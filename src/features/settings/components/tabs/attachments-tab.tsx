"use client";

import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, FileTextIcon, FileTypeCornerIcon, TrashIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import type { AttachmentOrder, AttachmentTypeFilter } from "~/features/attachments/hooks/use-attachments";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useAttachmentsPage, useDeleteAttachments, useStorageQuota } from "~/features/attachments/hooks/use-attachments";

function formatBytes(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StorageBar() {
  const { data, isLoading } = useStorageQuota();

  if (isLoading || !data) {
    return (
      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Loading storage info...</span>
        </div>
      </div>
    );
  }

  const { used, quota } = data;
  const percentage = Math.min((used / quota) * 100, 100);
  const isWarning = percentage >= 80 && percentage < 95;
  const isCritical = percentage >= 95;

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">Storage</span>
        <span className={isCritical
          ? "text-destructive"
          : isWarning
            ? "text-warning"
            : "text-muted-foreground"}
        >
          {formatBytes(used)}
          {" "}
          of
          {" "}
          {formatBytes(quota)}
          {" "}
          used
        </span>
      </div>
      <Progress
        value={percentage}
        className={isCritical
          ? "*:data-[slot=progress-indicator]:bg-destructive"
          : isWarning
            ? "*:data-[slot=progress-indicator]:bg-warning"
            : ""}
      />
      {isCritical && (
        <p className="text-destructive mt-2 text-xs">
          Storage almost full. Delete files to upload more.
        </p>
      )}
    </div>
  );
}

function FilePreview({ url, mediaType, filename }: { url: string; mediaType: string; filename: string }) {
  const isImage = mediaType.startsWith("image/");
  const isPdf = mediaType === "application/pdf";
  const isText = mediaType === "text/plain";

  if (isImage) {
    return (
      <Image
        src={url}
        alt={filename}
        width={32}
        height={32}
        className="size-8 rounded object-cover"
      />
    );
  }

  if (isPdf) {
    return (
      <div className="bg-muted flex size-8 items-center justify-center rounded">
        <FileTypeCornerIcon className="text-primary size-5" />
      </div>
    );
  }

  if (isText) {
    return (
      <div className="bg-muted flex size-8 items-center justify-center rounded">
        <FileTextIcon className="text-primary size-5" />
      </div>
    );
  }

  // Other files don't need an icon - they're always supported
  return null;
}

export function AttachmentsTab() {
  const [type, setType] = React.useState<AttachmentTypeFilter>("all");
  const [order, setOrder] = React.useState<AttachmentOrder>("desc");

  const [cursorStack, setCursorStack] = React.useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const cursor = cursorStack[pageIndex];

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmIds, setConfirmIds] = React.useState<string[]>([]);
  const [confirmLinkedCount, setConfirmLinkedCount] = React.useState(0);

  const { data, isLoading, isError, error, refetch } = useAttachmentsPage({
    type,
    order,
    cursor,
    enabled: true,
  });

  const deleteAttachments = useDeleteAttachments();

  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor;

  React.useEffect(() => {
    setCursorStack([undefined]);
    setPageIndex(0);
    setSelected({});
  }, [type, order]);

  const selectedIds = React.useMemo(() => {
    return Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }, [selected]);

  const someOnPageSelected = items.some(i => selected[i.id]);
  const allOnPageSelected = items.length > 0 && items.every(i => selected[i.id]);
  const headerChecked: boolean | "indeterminate" = allOnPageSelected
    ? true
    : someOnPageSelected
      ? "indeterminate"
      : false;

  const toggleAllOnPage = () => {
    if (items.length === 0)
      return;

    setSelected((prev) => {
      const next = { ...prev };
      if (allOnPageSelected) {
        items.forEach(i => delete next[i.id]);
        return next;
      }

      items.forEach((i) => {
        next[i.id] = true;
      });
      return next;
    });
  };

  const openConfirm = (ids: string[]) => {
    if (ids.length === 0)
      return;

    const linkedCount = items.filter(i => ids.includes(i.id) && i.isLinked).length;
    setConfirmIds(ids);
    setConfirmLinkedCount(linkedCount);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (confirmIds.length === 0)
      return;

    await toast.promise(deleteAttachments.mutateAsync(confirmIds), {
      loading: confirmIds.length === 1 ? "Deleting attachment..." : `Deleting ${confirmIds.length} attachments...`,
      success: confirmIds.length === 1 ? "Attachment deleted" : "Attachments deleted",
      error: "Failed to delete attachments",
    });

    setSelected({});
    setConfirmIds([]);
    setConfirmLinkedCount(0);
    setConfirmOpen(false);
    await refetch();
  };

  const goPrev = () => {
    if (pageIndex === 0)
      return;
    setPageIndex(pageIndex - 1);
    setSelected({});
  };

  const goNext = () => {
    if (!nextCursor)
      return;

    setCursorStack(prev => [...prev.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex(pageIndex + 1);
    setSelected({});
  };

  return (
    <div className="flex h-full flex-col">
      <div className="w-full space-y-4 p-6">
        <StorageBar />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground text-sm">Type</div>
              <Select value={type} onValueChange={value => setType(value as AttachmentTypeFilter)}>
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue placeholder="All files" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All files</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="text">Plain text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openConfirm(selectedIds)}
                disabled={deleteAttachments.isPending}
              >
                Delete selected (
                {selectedIds.length}
                )
              </Button>
            )}
          </div>
        </div>

        <div className="border-input overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={headerChecked}
                    onCheckedChange={toggleAllOnPage}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>File</TableHead>
                <TableHead className="w-24">Linked</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => setOrder(prev => (prev === "desc" ? "asc" : "desc"))}
                    className={`
                      hover:text-foreground
                      flex items-center gap-2 text-left
                    `}
                  >
                    Created
                    {order === "desc"
                      ? (
                          <ArrowDownIcon
                            className="size-4"
                            aria-hidden="true"
                          />
                        )
                      : (
                          <ArrowUpIcon
                            className="size-4"
                            aria-hidden="true"
                          />
                        )}
                  </button>
                </TableHead>
                <TableHead className="w-20 text-right">
                  <span className="sr-only">Delete</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="space-y-2 p-1">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {isError && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="p-2 text-sm">
                      <div className="text-destructive font-medium">
                        Failed to load attachments
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {error instanceof Error ? error.message : "Unknown error"}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-6 text-center text-sm"
                  >
                    No attachments found.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && items.length > 0 && items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={Boolean(selected[item.id])}
                      onCheckedChange={(checked) => {
                        setSelected(prev => ({ ...prev, [item.id]: Boolean(checked) }));
                      }}
                      aria-label={`Select ${item.filename}`}
                    />
                  </TableCell>
                  <TableCell className="flex-1">
                    <div className="flex items-center gap-3">
                      <FilePreview url={item.url} mediaType={item.mediaType} filename={item.filename} />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={item.url}
                          download={item.filename}
                          rel="noopener noreferrer"
                          target="_blank"
                          className={`
                            flex flex-row items-center
                            hover:underline
                          `}
                          title={item.filename}
                        >
                        <span className="text-sm max-w-80 truncate">
                          {item.filename}
                          </span>
                          <ExternalLinkIcon className={`
                            text-muted-foreground ml-1 inline-block size-3
                          `}
                          />
                        </Link>
                        <div className="text-muted-foreground text-xs">
                          {item.mediaType}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground w-24 text-xs">
                    {item.isLinked
                      ? (
                          <span className="text-warning">
                            Yes
                          </span>
                        )
                      : (
                          <span className="text-muted-foreground">
                            No
                          </span>
                        )}
                  </TableCell>
                  <TableCell className="text-muted-foreground w-32 text-xs">
                    {item.createdAt.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openConfirm([item.id])}
                      disabled={deleteAttachments.isPending}
                    >
                      <TrashIcon className="size-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="align-end flex items-center justify-between py-2">
          <div className="text-muted-foreground text-sm">
            Page
            {" "}
            {pageIndex + 1}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goPrev} disabled={pageIndex === 0}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={goNext} disabled={!nextCursor}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmIds([]);
            setConfirmLinkedCount(0);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete attachment
              {confirmIds.length === 1 ? "" : "s"}
            </DialogTitle>
            <DialogDescription>
              {confirmLinkedCount > 0
                ? `${confirmLinkedCount} of ${confirmIds.length} selected attachment${confirmIds.length === 1 ? " is" : "s are"} linked to chat history. Deleting will remove file references from those messages. This cannot be undone.`
                : `You are about to delete ${confirmIds.length} attachment${confirmIds.length === 1 ? "" : "s"}. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleteAttachments.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteAttachments.isPending}
            >
              {deleteAttachments.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
