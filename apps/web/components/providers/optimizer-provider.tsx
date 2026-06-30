"use client";

import { createContext, useContext, useMemo, useRef } from "react";
import type { PropsWithChildren } from "react";

import { useOptimizer } from "@/hooks/use-optimizer";
import { ACCEPTED_MIME_TYPES } from "@/lib/image/constants";

type OptimizerContextType = ReturnType<typeof useOptimizer> & {
  readonly openFilePicker: () => void;
};

const OptimizerContext = createContext<OptimizerContextType | null>(null);

export const OptimizerProvider = ({ children }: PropsWithChildren) => {
  const optimizer = useOptimizer();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const contextValue = useMemo(
    () => ({
      ...optimizer,
      openFilePicker,
    }),
    [optimizer]
  );

  return (
    <OptimizerContext.Provider value={contextValue}>
      {children}
      <input
        ref={inputRef}
        accept={ACCEPTED_MIME_TYPES.join(",")}
        aria-label="Select images to optimize"
        className="sr-only"
        multiple
        type="file"
        onChange={(event) => {
          if (event.target.files) {
            void optimizer.addFiles(event.target.files);
          }
          event.currentTarget.value = "";
        }}
      />
    </OptimizerContext.Provider>
  );
};

export const useOptimizerContext = (): OptimizerContextType => {
  const context = useContext(OptimizerContext);
  if (!context) {
    throw new Error(
      "useOptimizerContext must be used within an OptimizerProvider"
    );
  }
  return context;
};
