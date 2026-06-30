"use client";

import { Button } from "@vercel/geistdocs/components/button";
import { Spinner } from "@vercel/geistdocs/components/spinner";
import { Trash2, Upload, AlertCircle } from "lucide-react";

import { Logo } from "@/components/logo";
import { OptimizerQueueItem } from "@/components/optimizer-queue-item";
import { useDragDrop } from "@/components/providers/drag-drop-provider";
import { useOptimizerContext } from "@/components/providers/optimizer-provider";
import { cn } from "@/lib/utils";

export const OptimizerQueuePanel = () => {
  const { dropActive } = useDragDrop();
  const {
    isProcessing,
    jobs,
    filteredJobs,
    notice,
    selectedId,
    setSelectedId,
    openFilePicker,
    clearAll,
  } = useOptimizerContext();

  const renderContent = () => {
    if (jobs.length === 0) {
      return (
        <button
          className="flex min-h-[16rem] w-full flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed border-gray-alpha-400 bg-background-100/50 p-4 text-center hover:bg-background-100"
          type="button"
          onClick={openFilePicker}
        >
          <Upload className="size-8 text-gray-700" strokeWidth={1.5} />
          <div className="flex flex-col gap-1">
            <span className="text-label-13 font-medium text-gray-1000">
              Select or drop images
            </span>
            <span className="text-label-12 text-gray-800">PNG, JPEG, WebP</span>
          </div>
        </button>
      );
    }

    if (filteredJobs.length === 0) {
      return (
        <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 text-center text-gray-800 p-4">
          <span className="text-label-13 font-medium text-gray-1000">
            No matching images
          </span>
          <span className="text-label-12">
            Try modifying your query or filters.
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {filteredJobs.map((job) => (
          <OptimizerQueueItem
            job={job}
            key={job.id}
            selected={selectedId === job.id}
            onSelect={() => setSelectedId(job.id)}
          />
        ))}
      </div>
    );
  };

  return (
    <aside
      aria-label="Image optimizer sidebar"
      className={cn(
        "flex h-full w-72 shrink-0 flex-col border-r border-gray-alpha-400 bg-background-200 transition-colors",
        dropActive && "bg-blue-100/30"
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-gray-alpha-400 px-4">
        <Logo className="size-6 fill-current text-current" />
        <div className="flex flex-col">
          <span className="text-label-13 font-bold text-gray-1000 leading-tight">
            Pigo
          </span>
          <span className="text-[11px] font-medium text-gray-800 leading-none">
            Image Optimizer
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-label-13 font-medium text-gray-900">
              Queue ({filteredJobs.length})
            </span>
            {isProcessing && (
              <Spinner
                aria-label="Processing"
                className="size-4 text-gray-700"
              />
            )}
          </div>

          {renderContent()}
        </div>
      </div>

      {notice && (
        <div className="mx-3 mb-1 mt-auto flex items-start gap-2 rounded-[6px] bg-amber-100/50 p-2 border border-amber-200 text-copy-13 text-amber-1000">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      <div className="flex shrink-0 flex-col gap-2 border-t border-gray-alpha-400 p-3 bg-background-200">
        <Button
          className="w-full flex items-center justify-center gap-2"
          type="button"
          onClick={openFilePicker}
        >
          <Upload className="size-4" />
          Select Files
        </Button>
        <Button
          className="w-full flex items-center justify-center gap-2"
          disabled={jobs.length === 0}
          type="button"
          variant="ghost"
          onClick={clearAll}
        >
          <Trash2 className="size-4" />
          Clear All
        </Button>
      </div>
    </aside>
  );
};
