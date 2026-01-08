"use client";

import { ArrowDownIcon, ArrowUpIcon, FileTypeCornerIcon, TrashIcon } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";

import type { AttachmentOrder, AttachmentTypeFilter } from "~/lib/queries/use-attachments";

import { useAttachmentsPage, useDeleteAttachments } from "~/lib/queries/use-attachments";

import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

function FilePreview({ url, mediaType, filename }: { url: string; mediaType: string; filename: string }) {
  const isImage = mediaType.startsWith("image/");
  const isPdf = mediaType === "application/pdf";

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

  // Plain text and other files don't need an icon - they're always supported
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
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Attachments</h3>
        <p className="text-muted-foreground text-sm">
          Manage your uploaded files.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto space-y-4">
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
                            <ArrowDownIcon className="size-4" aria-hidden="true" />
                          )
                        : (
                            <ArrowUpIcon className="size-4" aria-hidden="true" />
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
                        <div className="text-destructive font-medium">Failed to load attachments</div>
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
                          <div className="truncate text-sm" title={item.filename}>
                            {item.filename}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {item.mediaType}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground w-24 text-xs">
                      {item.isLinked
                        ? <span className="text-amber-600">Yes</span>
                        : <span className="text-muted-foreground">No</span>}
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

        </div>

      </div>
      <div className="align-end flex items-center justify-between p-6">
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
