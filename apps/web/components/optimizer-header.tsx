"use client";

import { Button } from "@vercel/geistdocs/components/button";
import { Trash2, Upload } from "lucide-react";

import { useOptimizerContext } from "@/components/providers/optimizer-provider";

import { Logo } from "./logo";

export const OptimizerHeader = () => {
  const { jobs, clearAll, openFilePicker } = useOptimizerContext();

  return (
    <header className="flex shrink-0 flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Logo className="size-8" />
        <div>
          <h1 className="text-heading-20 text-gray-1000">Pigo</h1>
          <p className="text-label-13 text-gray-900">
            JPEG, PNG, and browser WebP optimization
          </p>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <Button
          className="w-full sm:w-auto"
          type="button"
          onClick={openFilePicker}
        >
          <Upload aria-hidden="true" />
          Select Files
        </Button>
        <Button
          className="w-full sm:w-auto"
          type="button"
          variant="ghost"
          disabled={jobs.length === 0}
          onClick={clearAll}
        >
          <Trash2 aria-hidden="true" />
          Clear All
        </Button>
      </div>
    </header>
  );
};
