"use client";

import { createContext, useCallback, useMemo, useRef, use } from "react";
import type { PropsWithChildren } from "react";

import type { OptimizerActions, OptimizerState } from "@/hooks/use-optimizer";
import { useOptimizer } from "@/hooks/use-optimizer";
import { ACCEPTED_MIME_TYPES } from "@/lib/image/constants";

type OptimizerActionsContextType = OptimizerActions & {
  readonly openFilePicker: () => void;
};

// Two contexts, not one: every action is stable for the provider's lifetime, so
// components that only dispatch never re-render, no matter how often the
// reactive slice changes.
const OptimizerStateContext = createContext<OptimizerState | null>(null);
const OptimizerActionsContext =
  createContext<OptimizerActionsContextType | null>(null);

export const OptimizerProvider = ({ children }: PropsWithChildren) => {
  const { actions, state } = useOptimizer();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const actionsValue = useMemo(
    () => ({ ...actions, openFilePicker }),
    [actions, openFilePicker]
  );

  return (
    <OptimizerActionsContext.Provider value={actionsValue}>
      <OptimizerStateContext.Provider value={state}>
        {children}
      </OptimizerStateContext.Provider>
      <input
        ref={inputRef}
        accept={ACCEPTED_MIME_TYPES.join(",")}
        aria-label="Select images to optimize"
        className="sr-only"
        multiple
        type="file"
        onChange={(event) => {
          if (event.target.files) {
            void actions.addFiles(event.target.files);
          }
          event.currentTarget.value = "";
        }}
      />
    </OptimizerActionsContext.Provider>
  );
};

export const useOptimizerState = (): OptimizerState => {
  const context = use(OptimizerStateContext);
  if (!context) {
    throw new Error(
      "useOptimizerState must be used within an OptimizerProvider"
    );
  }
  return context;
};

export const useOptimizerActions = (): OptimizerActionsContextType => {
  const context = use(OptimizerActionsContext);
  if (!context) {
    throw new Error(
      "useOptimizerActions must be used within an OptimizerProvider"
    );
  }
  return context;
};
