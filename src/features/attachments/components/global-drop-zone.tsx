"use client";

import * as React from "react";

type GlobalDropZoneContextValue = {
  isDraggingOver: boolean;
  setDropHandler: (handler: ((files: FileList) => void) | null) => void;
};

const GlobalDropZoneContext = React.createContext<GlobalDropZoneContextValue | null>(null);

export function useGlobalDropZone(onDrop?: (files: FileList) => void) {
  const context = React.useContext(GlobalDropZoneContext);

  React.useEffect(() => {
    if (onDrop && context) {
      context.setDropHandler(() => onDrop);
      return () => context.setDropHandler(null);
    }
  }, [onDrop, context]);

  return context?.isDraggingOver ?? false;
}

export function GlobalDropZoneProvider({ children }: { children: React.ReactNode }) {
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [dropHandler, setDropHandler] = React.useState<((files: FileList) => void) | null>(null);
  const dragCounterRef = React.useRef(0);

  React.useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDraggingOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0 && dropHandler) {
        dropHandler(files);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [dropHandler]);

  const contextValue = React.useMemo(
    () => ({ isDraggingOver, setDropHandler }),
    [isDraggingOver],
  );

  return (
    <GlobalDropZoneContext.Provider value={contextValue}>
      {children}
    </GlobalDropZoneContext.Provider>
  );
}
