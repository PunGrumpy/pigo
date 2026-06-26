"use client";

import { Toaster } from "@vercel/geistdocs/components/sonner";
import { TooltipProvider } from "@vercel/geistdocs/components/tooltip";
import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";

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
