"use client";

import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";

import { Toaster } from "../ui/sonner";
import { TooltipProvider } from "../ui/tooltip";

export const DesignSystemProvider = ({ children }: PropsWithChildren) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    disableTransitionOnChange
    enableSystem
  >
    <TooltipProvider delayDuration={0}>
      {children}
      <Toaster />
    </TooltipProvider>
  </ThemeProvider>
);
