"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  use,
} from "react";
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

  const handleDragEnter = useCallback((event: DragEvent) => {
    event.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setDropActive(true);
    }
  }, []);

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setDropActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      dragCounter.current = 0;
      setDropActive(false);

      if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        void addFiles(event.dataTransfer.files);
      }
    },
    [addFiles]
  );

  useEffect(() => {
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
  }, [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  const value = useMemo(() => ({ dropActive }), [dropActive]);

  return (
    <DragDropContext.Provider value={value}>
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
