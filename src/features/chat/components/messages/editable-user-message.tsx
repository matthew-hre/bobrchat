"use client";

import { useCallback, useMemo, useState } from "react";

import type { AppFileUIPart, ChatUIMessage } from "~/features/chat/types";

import { isFilePart, isTextPart } from "~/features/chat/types";
import { useLongPress } from "~/lib/hooks";
import { cn } from "~/lib/utils";

import type { EditedMessagePayload, ExistingAttachment } from "./inline-message-editor";

import { UserMessageMetrics } from "../ui/user-message-metrics";
import { UserMessageMetricsSheet } from "../ui/user-message-metrics-sheet";
import { InlineMessageEditor } from "./inline-message-editor";
import { UserMessage } from "./user-message";

type EditableUserMessageProps = {
  message: ChatUIMessage;
  previousModelId: string | null;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (payload: EditedMessagePayload) => Promise<void>;
  canEdit?: boolean;
  isSubmitting?: boolean;
};

function extractTextAndAttachments(message: ChatUIMessage): {
  textContent: string;
  attachments: ExistingAttachment[];
} {
  const textContent = message.parts
    .filter(isTextPart)
    .map(part => part.text)
    .join("");

  const attachments = message.parts
    .filter(isFilePart)
    .reduce<ExistingAttachment[]>((acc, part) => {
      const filePart = part as AppFileUIPart;
      if (!filePart.id)
        return acc;

      acc.push({
        id: filePart.id,
        url: filePart.url,
        filename: filePart.filename,
        mediaType: filePart.mediaType,
        storagePath: filePart.storagePath,
      });
      return acc;
    }, []);

  return { textContent, attachments };
}

export function EditableUserMessage({
  message,
  previousModelId,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  canEdit = true,
  isSubmitting = false,
}: EditableUserMessageProps) {
  const { textContent, attachments } = useMemo(
    () => extractTextAndAttachments(message),
    [message],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const onLongPress = useCallback(() => setSheetOpen(true), []);
  const longPressProps = useLongPress({ onLongPress });

  return (
    <div className="group flex w-full flex-col items-end gap-2" {...longPressProps}>
      <div className={cn(`
        relative w-full max-w-[80%]
        md:max-w-[70%]
      `, isEditing
        ? `
          max-w-[90%]
          md:max-w-[80%]
        `
        : "")}
      >
        <div
          className={cn(
            "transition-all duration-200 ease-out",
            isEditing
              ? "pointer-events-none absolute inset-0 scale-95 opacity-0"
              : "static scale-100 opacity-100",
          )}
        >
          <div className="flex flex-col items-end">
            <UserMessage
              content={textContent}
              attachments={attachments.length > 0 ? attachments : undefined}
            />
          </div>
        </div>

        <div
          className={cn(
            "transition-all duration-200 ease-out",
            isEditing
              ? "static scale-100 opacity-100"
              : "pointer-events-none absolute inset-0 scale-95 opacity-0",
          )}
        >
          {isEditing && (
            <InlineMessageEditor
              initialContent={textContent}
              initialAttachments={attachments}
              initialSearchEnabled={message.searchEnabled ?? false}
              initialReasoningLevel={message.reasoningLevel ?? "none"}
              initialModelId={previousModelId}
              onCancel={onCancelEdit}
              onSubmit={onSubmitEdit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="touch-device-hidden">
          <UserMessageMetrics
            content={textContent}
            onEdit={canEdit ? onStartEdit : undefined}
          />
        </div>
      )}

      <UserMessageMetricsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        content={textContent}
        onEdit={canEdit ? onStartEdit : undefined}
      />
    </div>
  );
}
