"use client";

import { createContext, useEffect, useRef, useState, use } from "react";
import type { PropsWithChildren } from "react";

import { useOptimizerContext } from "./optimizer-provider";

interface DragDropContextType {
  readonly dropActive: boolean;
}

const DragDropContext = createContext<DragDropContextType | null>(null);

export const DragDropProvider = ({ children }: PropsWithChildren) => {
  const [dropActive, setDropActive] = useState(false);
  const { addFiles } = useOptimizerContext();
  const dragCounter = useRef(0);

  useEffect(() => {
    const handleDragEnter = (event: DragEvent) => {
      event.preventDefault();
      dragCounter.current += 1;
      if (dragCounter.current === 1) {
        setDropActive(true);
      }
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
    };

    const handleDragLeave = (event: DragEvent) => {
      event.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setDropActive(false);
      }
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      dragCounter.current = 0;
      setDropActive(false);

      if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        void addFiles(event.dataTransfer.files);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [addFiles]);

  return (
    <DragDropContext.Provider value={{ dropActive }}>
      {children}
    </DragDropContext.Provider>
  );
};

export const useDragDrop = (): DragDropContextType => {
  const context = use(DragDropContext);
  if (!context) {
    throw new Error("useDragDrop must be used within a DragDropProvider");
  }
  return context;
};
