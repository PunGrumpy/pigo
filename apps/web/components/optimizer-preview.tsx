"use client";

import { Button } from "@vercel/geistdocs/components/button";
import { Spinner } from "@vercel/geistdocs/components/spinner";
import {
  ChevronsLeftRight,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import { memo, useCallback, useRef, useState } from "react";

import { useCompareSlider } from "@/hooks/use-compare-slider";
import type { Transform } from "@/hooks/use-image-transform";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  useImageTransform,
} from "@/hooks/use-image-transform";
import { isJobPending } from "@/lib/image/job";
import type { ImageJob } from "@/lib/image/types";
import { cn } from "@/lib/utils";

const DIVIDER_GRAB_PERCENT = 5;

interface OptimizerPreviewProps {
  job: ImageJob;
  onDownload: (job: ImageJob) => void;
  onRemove: (job: ImageJob) => void;
  onSliderChange: (job: ImageJob, value: number) => void;
}

interface ZoomControlsProps {
  zoom: number;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const ZoomControlsImpl = ({
  zoom,
  onReset,
  onZoomIn,
  onZoomOut,
}: ZoomControlsProps) => (
  <div
    className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gray-alpha-300 bg-background-100/90 px-2 py-1 shadow-sm backdrop-blur-md"
    onPointerCancel={(e) => e.stopPropagation()}
    onPointerDown={(e) => e.stopPropagation()}
    onPointerMove={(e) => e.stopPropagation()}
    onPointerUp={(e) => e.stopPropagation()}
  >
    <Button
      size="icon-sm"
      variant="ghost"
      className="rounded-full"
      disabled={zoom <= MIN_ZOOM}
      onClick={onZoomOut}
    >
      <ZoomOut className="size-3 text-gray-800" />
    </Button>
    <span className="min-w-[3.5rem] text-center text-[11px] font-mono font-medium text-gray-1000">
      {Math.round(zoom * 100)}%
    </span>
    <Button
      size="icon-sm"
      variant="ghost"
      className="rounded-full"
      disabled={zoom >= MAX_ZOOM}
      onClick={onZoomIn}
    >
      <ZoomIn className="size-3 text-gray-800" />
    </Button>
    <div
      className={cn(
        "grid transition-[grid-template-columns] duration-150 ease-out",
        zoom > MIN_ZOOM ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
      )}
    >
      <div className="min-w-0 overflow-hidden" inert={zoom <= MIN_ZOOM}>
        <Button
          className={cn(
            "ml-1 flex h-8 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] transition-opacity duration-150 ease-out",
            zoom > MIN_ZOOM ? "opacity-100" : "opacity-0"
          )}
          size="sm"
          variant="ghost"
          onClick={onReset}
        >
          <RotateCcw className="size-3 text-gray-800" />
          Reset
        </Button>
      </div>
    </div>
  </div>
);

const ZoomControls = memo(ZoomControlsImpl);

interface ComparisonViewportProps {
  compareRef: React.RefObject<HTMLDivElement | null>;
  job: ImageJob;
  sliderValue: number;
  transform: Transform;
  isPanning: boolean;
  isDragging: boolean;
  onComparePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onComparePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  endCompareDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const ComparisonViewport = ({
  compareRef,
  job,
  sliderValue,
  transform,
  isPanning,
  isDragging,
  onComparePointerDown,
  onComparePointerMove,
  endCompareDrag,
  onReset,
  onZoomIn,
  onZoomOut,
}: ComparisonViewportProps) => {
  const imageTransform = {
    transform: `translate(${transform.pan.x}px, ${transform.pan.y}px) scale(${transform.zoom})`,
    transformOrigin: "center",
  };
  const imageClassName = cn(
    "max-h-full max-w-full object-contain",
    transform.animate &&
      !isPanning &&
      !isDragging &&
      "transition-transform duration-300 ease-out"
  );

  return (
    <div
      ref={compareRef}
      className={cn(
        "relative flex min-h-[50vh] touch-none items-center justify-center overflow-hidden rounded-[6px] bg-gray-100 select-none lg:min-h-0 lg:flex-1",
        job.result &&
          transform.zoom > MIN_ZOOM &&
          isPanning &&
          "cursor-grabbing",
        job.result && transform.zoom > MIN_ZOOM && !isPanning && "cursor-grab",
        job.result && transform.zoom <= MIN_ZOOM && "cursor-ew-resize"
      )}
      onPointerCancel={endCompareDrag}
      onPointerDown={onComparePointerDown}
      onPointerMove={onComparePointerMove}
      onPointerUp={endCompareDrag}
    >
      <Image
        alt={`Original ${job.name}`}
        className={imageClassName}
        draggable={false}
        height={job.height}
        src={job.originalUrl}
        style={imageTransform}
        unoptimized
        width={job.width}
      />
      {job.result ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
          >
            <Image
              alt={`Optimized ${job.name}`}
              className={imageClassName}
              draggable={false}
              height={job.result.height}
              src={job.result.url}
              style={imageTransform}
              unoptimized
              width={job.result.width}
            />
          </div>

          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 z-10 w-px -translate-x-1/2 bg-background-100 ring-1",
              isDragging
                ? "ring-blue-600 shadow-[0_0_8px_rgba(0,112,243,0.3)]"
                : "ring-gray-alpha-400"
            )}
            style={{ left: `${sliderValue}%` }}
          />

          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 z-20 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background-100 shadow-sm transition-[transform,border-color,box-shadow] duration-150 ease-out",
              isDragging
                ? "scale-110 border-blue-600 text-blue-600 shadow-[0_0_12px_rgba(0,112,243,0.2)]"
                : "border-gray-alpha-400 text-gray-1000 hover:scale-105 hover:border-gray-alpha-500"
            )}
            style={{ left: `${sliderValue}%` }}
          >
            <ChevronsLeftRight className="size-4" strokeWidth={2} />
          </div>

          <span className="pointer-events-none absolute top-3 left-3 z-20 hidden rounded-[6px] border border-gray-alpha-400 bg-background-100 px-2 py-1 text-label-12 text-gray-1000 shadow-xs sm:inline">
            Original
          </span>
          <span className="pointer-events-none absolute top-3 right-3 z-20 hidden rounded-[6px] border border-gray-alpha-400 bg-background-100 px-2 py-1 text-label-12 text-gray-1000 shadow-xs sm:inline">
            Optimized
          </span>

          <ZoomControls
            zoom={transform.zoom}
            onReset={onReset}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
          />
        </>
      ) : null}

      {isJobPending(job) ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-alpha-100 z-20">
          <Spinner
            aria-label="Processing"
            className="size-[22px] text-gray-900"
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
  );
};

export const OptimizerPreview = ({
  job,
  onDownload,
  onRemove,
  onSliderChange,
}: OptimizerPreviewProps) => {
  const compareRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRectRef = useRef<DOMRect | null>(null);

  const hasResult = job.result !== undefined;
  const {
    beginPan,
    endPan,
    isPanning,
    movePan,
    reset,
    transform,
    zoomIn,
    zoomOut,
  } = useImageTransform(compareRef, hasResult);
  const { cancelReveal, commitSlider, setSlider, slider } = useCompareSlider(
    job,
    onSliderChange
  );

  // The divider moves the layout every frame, so re-measuring mid-drag would
  // force a synchronous layout each time. The gesture's rect is captured once.
  const updateFromPointer = useCallback(
    (clientX: number) => {
      const rect =
        dragRectRef.current ?? compareRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const value = Math.min(
        100,
        Math.max(0, ((clientX - rect.left) / rect.width) * 100)
      );
      setSlider(Math.round(value));
    },
    [setSlider]
  );

  const onComparePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    cancelReveal();
    if (!hasResult) {
      return;
    }
    event.preventDefault();

    const rect = compareRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    dragRectRef.current = rect;

    const clickXPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const isNearDivider =
      Math.abs(clickXPercent - slider) < DIVIDER_GRAB_PERCENT;

    event.currentTarget.setPointerCapture(event.pointerId);

    if (transform.zoom > MIN_ZOOM && !isNearDivider) {
      beginPan(event.clientX, event.clientY);
    } else {
      setIsDragging(true);
      updateFromPointer(event.clientX);
    }
  };

  const onComparePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateFromPointer(event.clientX);
      return;
    }
    if (isPanning) {
      movePan(event.clientX, event.clientY);
    }
  };

  const endCompareDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (isDragging) {
      commitSlider(slider);
    }
    dragRectRef.current = null;
    setIsDragging(false);
    endPan();
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

      <ComparisonViewport
        compareRef={compareRef}
        endCompareDrag={endCompareDrag}
        isDragging={isDragging}
        isPanning={isPanning}
        job={job}
        onComparePointerDown={onComparePointerDown}
        onComparePointerMove={onComparePointerMove}
        onReset={reset}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        sliderValue={slider}
        transform={transform}
      />

      {job.result ? (
        <div className="flex shrink-0 flex-col gap-3 rounded-[6px] border border-gray-alpha-400 bg-background-100 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-label-13 text-gray-900">Original</span>
            <span className="text-label-13-mono text-gray-1000">{slider}%</span>
            <span className="text-label-13 text-gray-900">Optimized</span>
          </div>
          <input
            aria-label="Before and after comparison"
            className="compare-range w-full py-3 lg:py-0"
            max="100"
            min="0"
            step="1"
            type="range"
            value={slider}
            onBlur={() => commitSlider(slider)}
            onChange={(event) => {
              cancelReveal();
              setSlider(Number(event.target.value));
            }}
            onKeyUp={() => commitSlider(slider)}
            onPointerUp={() => commitSlider(slider)}
          />
        </div>
      ) : null}
    </div>
  );
};
