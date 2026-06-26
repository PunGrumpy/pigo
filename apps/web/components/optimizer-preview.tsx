"use client";

import { Button } from "@vercel/geistdocs/components/button";
import { ChevronsLeftRight, Download, Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { OptimizerMetadataGrid } from "@/components/optimizer-metadata-grid";
import { isJobPending } from "@/lib/image/job";
import type { ImageJob } from "@/lib/image/types";
import { cn } from "@/lib/utils";

interface OptimizerPreviewProps {
  job: ImageJob;
  onDownload: (job: ImageJob) => void;
  onRemove: (job: ImageJob) => void;
  onSliderChange: (job: ImageJob, value: number) => void;
}

export const OptimizerPreview = ({
  job,
  onDownload,
  onRemove,
  onSliderChange,
}: OptimizerPreviewProps) => {
  const compareRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const rect = compareRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const value = Math.min(
        100,
        Math.max(0, ((clientX - rect.left) / rect.width) * 100)
      );
      onSliderChange(job, Math.round(value));
    },
    [job, onSliderChange]
  );

  const onComparePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!job.result) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    updateFromPointer(event.clientX);
  };

  const onComparePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }
    updateFromPointer(event.clientX);
  };

  const endCompareDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label-13 text-gray-900">
            {job.inputFormat.toUpperCase()}
          </p>
          <h2 className="truncate text-heading-16 text-gray-1000">
            {job.name}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            disabled={!job.result}
            size="icon-sm"
            title="Download Image"
            type="button"
            variant="ghost"
            onClick={() => onDownload(job)}
          >
            <Download aria-hidden="true" />
          </Button>
          <Button
            size="icon-sm"
            title="Remove this image"
            type="button"
            variant="ghost"
            onClick={() => onRemove(job)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div
        ref={compareRef}
        className={cn(
          "relative flex min-h-[50vh] touch-none items-center justify-center overflow-hidden rounded-[6px] bg-gray-100 select-none lg:min-h-0 lg:flex-1",
          job.result && "cursor-ew-resize"
        )}
        onPointerCancel={endCompareDrag}
        onPointerDown={onComparePointerDown}
        onPointerMove={onComparePointerMove}
        onPointerUp={endCompareDrag}
      >
        <img
          alt={`Original ${job.name}`}
          className="max-h-full max-w-full object-contain"
          draggable={false}
          src={job.originalUrl}
        />
        {job.result ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ clipPath: `inset(0 ${100 - job.slider}% 0 0)` }}
            >
              <img
                alt={`Optimized ${job.name}`}
                className="max-h-full max-w-full object-contain"
                draggable={false}
                src={job.result.url}
              />
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-10 w-px -translate-x-1/2 bg-background-100 ring-1 ring-gray-alpha-400"
              style={{ left: `${job.slider}%` }}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 z-20 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-alpha-400 bg-background-100 shadow-xs"
              style={{ left: `${job.slider}%` }}
            >
              <ChevronsLeftRight
                className="size-4 text-gray-1000"
                strokeWidth={2}
              />
            </div>

            <span className="pointer-events-none absolute top-3 left-3 z-20 hidden rounded-[6px] border border-gray-alpha-400 bg-background-100 px-2 py-1 text-label-12 text-gray-1000 shadow-xs sm:inline">
              Original
            </span>
            <span className="pointer-events-none absolute top-3 right-3 z-20 hidden rounded-[6px] border border-gray-alpha-400 bg-background-100 px-2 py-1 text-label-12 text-gray-1000 shadow-xs sm:inline">
              Optimized
            </span>
          </>
        ) : null}

        {isJobPending(job) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-alpha-100">
            <Loader2
              aria-hidden="true"
              className="size-[22px] animate-spin text-gray-900"
            />
            <span className="text-label-14 text-gray-900">Processing…</span>
          </div>
        ) : null}

        {job.status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100/90 px-4">
            <span className="text-center text-copy-14 text-red-800">
              {job.error ?? "Compression failed"}
            </span>
          </div>
        ) : null}
      </div>

      {job.result ? (
        <div className="flex shrink-0 flex-col gap-3 rounded-[6px] border border-gray-alpha-400 bg-background-100 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-label-13 text-gray-900">Original</span>
            <span className="text-label-13-mono text-gray-1000">
              {job.slider}%
            </span>
            <span className="text-label-13 text-gray-900">Optimized</span>
          </div>
          <input
            aria-label="Before and after comparison"
            className="compare-range w-full py-3 lg:py-0"
            max="100"
            min="0"
            step="1"
            type="range"
            value={job.slider}
            onChange={(event) =>
              onSliderChange(job, Number(event.target.value))
            }
          />
        </div>
      ) : null}

      <OptimizerMetadataGrid job={job} />
    </div>
  );
};
