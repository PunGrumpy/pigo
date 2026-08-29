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

import { useOptimizerActions } from "./optimizer-provider";

interface DragDropContextType {
  readonly dropActive: boolean;
}

const DragDropContext = createContext<DragDropContextType | null>(null);

const traverseFileTree = async (item: DataTransferItem): Promise<File[]> => {
  if (typeof item.webkitGetAsEntry !== "function") {
    return [];
  }
  const entry = item.webkitGetAsEntry();
  if (!entry) {
    return [];
  }

  const files: File[] = [];

  const traverse = async (currentEntry: FileSystemEntry): Promise<void> => {
    if (currentEntry.isFile) {
      // eslint-disable-next-line promise/avoid-new
      const file = await new Promise<File>((resolve, reject) => {
        (currentEntry as FileSystemFileEntry).file(resolve, reject);
      });
      files.push(file);
    } else if (currentEntry.isDirectory) {
      const dirReader = (
        currentEntry as FileSystemDirectoryEntry
      ).createReader();

      const readBatch = (): Promise<FileSystemEntry[]> =>
        // eslint-disable-next-line promise/avoid-new
        new Promise<FileSystemEntry[]>((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });

      // readEntries yields at most ~100 entries per call, so drain it in a
      // loop. Concatenating batches recursively would rebuild the whole array
      // on every step.
      const readAllEntries = async (): Promise<FileSystemEntry[]> => {
        const entries: FileSystemEntry[] = [];
        let batch = await readBatch();
        while (batch.length > 0) {
          entries.push(...batch);
          // readEntries is a cursor over one directory: the next batch only
          // exists once the previous call has returned.
          // oxlint-disable-next-line no-await-in-loop
          batch = await readBatch();
        }
        return entries;
      };

      const allEntries = await readAllEntries();
      await Promise.all(allEntries.map((childEntry) => traverse(childEntry)));
    }
  };

  await traverse(entry);
  return files;
};

export const DragDropProvider = ({ children }: PropsWithChildren) => {
  const [dropActive, setDropActive] = useState(false);
  const { addFiles } = useOptimizerActions();
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
    async (event: DragEvent) => {
      event.preventDefault();
      dragCounter.current = 0;
      setDropActive(false);

      if (event.dataTransfer?.items) {
        const items = [...event.dataTransfer.items].filter(
          (item) => item.kind === "file"
        );
        const filePromises = items.map((item) => traverseFileTree(item));
        const fileGroups = await Promise.all(filePromises);
        const allFiles = fileGroups.flat();

        if (allFiles.length > 0) {
          void addFiles(allFiles);
        }
      } else if (
        event.dataTransfer?.files &&
        event.dataTransfer.files.length > 0
      ) {
        void addFiles([...event.dataTransfer.files]);
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
